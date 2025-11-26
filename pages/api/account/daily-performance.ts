import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { DailyPerformance } from '../../../types';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { startDate, endDate } = req.query;

        const dateFilter: any = {};
        if (startDate && endDate) {
            dateFilter.date = {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string),
            };
        }

        // Fetch data grouped by date from all three tables
        const [salesByDate, adsByDate, trafficByDate] = await Promise.all([
            prisma.piSalesData.groupBy({
                by: ['date'],
                _sum: {
                    orderAmount: true,
                    orderQuantity: true,
                },
                where: dateFilter,
            }),
            prisma.adsData.groupBy({
                by: ['date'],
                _sum: {
                    spend: true,
                    paidSales: true,
                    paidOrders: true,
                    impressions: true,
                    clicks: true,
                },
                where: dateFilter,
            }),
            prisma.piGvData.groupBy({
                by: ['date'],
                _sum: {
                    indexedGlanceViews: true,
                    adNumber: true, // Paid GV
                    organicNumber: true, // Organic GV
                },
                where: dateFilter,
            }),
        ]);

        // Merge data by date
        const dateMap = new Map<string, Partial<DailyPerformance>>();

        // Helper to get or create entry
        const getEntry = (date: Date) => {
            const dateStr = date.toISOString().split('T')[0];
            if (!dateMap.has(dateStr)) {
                dateMap.set(dateStr, {
                    date: dateStr,
                    spend: 0,
                    overallSales: 0,
                    paidSales: 0,
                    organicSales: 0,
                    glanceViews: 0,
                    impressions: 0,
                    clicks: 0,
                    totalOrders: 0,
                    paidOrders: 0,
                    conversionRate: 0,
                    paidGlanceViews: 0,
                    organicGlanceViews: 0,
                });
            }
            return dateMap.get(dateStr)!;
        };

        // Process Sales Data
        salesByDate.forEach((item: any) => {
            const entry = getEntry(item.date);
            entry.overallSales = Number(item._sum.orderAmount || 0);
            entry.totalOrders = Number(item._sum.orderQuantity || 0);
        });

        // Process Ads Data
        adsByDate.forEach((item: any) => {
            const entry = getEntry(item.date);
            entry.spend = Number(item._sum.spend || 0);
            entry.paidSales = Number(item._sum.paidSales || 0);
            entry.paidOrders = Number(item._sum.paidOrders || 0);
            entry.impressions = Number(item._sum.impressions || 0);
            entry.clicks = Number(item._sum.clicks || 0);
        });

        // Process Traffic Data
        trafficByDate.forEach((item: any) => {
            const entry = getEntry(item.date);
            entry.glanceViews = Number(item._sum.indexedGlanceViews || 0);
            entry.paidGlanceViews = Number(item._sum.adNumber || 0);
            entry.organicGlanceViews = Number(item._sum.organicNumber || 0);
        });

        // Calculate derived metrics and convert to array
        const dailyPerformance = Array.from(dateMap.values()).map((entry) => {
            const e = entry as DailyPerformance;

            // Calculate organic sales
            e.organicSales = e.overallSales - e.paidSales;

            // Calculate derived metrics
            e.roas = e.spend > 0 ? e.paidSales / e.spend : 0;
            e.acos = e.paidSales > 0 ? (e.spend / e.paidSales) * 100 : 0;
            e.ctr = e.impressions > 0 ? (e.clicks / e.impressions) * 100 : 0;
            e.cpc = e.clicks > 0 ? e.spend / e.clicks : 0;
            e.conversionRate = e.glanceViews > 0 ? (e.totalOrders / e.glanceViews) * 100 : 0;

            return e;
        });

        // Sort by date descending
        dailyPerformance.sort((a, b) => b.date.localeCompare(a.date));

        res.status(200).json(dailyPerformance);
    } catch (error) {
        console.error('Error fetching account daily performance:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

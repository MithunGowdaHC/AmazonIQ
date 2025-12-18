import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { DailyPerformance } from '../../../types';
import { format } from 'date-fns';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { asin, startDate, endDate } = req.query;

        if (!asin) {
            return res.status(400).json({ message: 'ASIN is required' });
        }

        const dateFilter: any = {
            asin: asin as string,
        };

        if (startDate && endDate) {
            dateFilter.date = {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string),
            };
        }

        // Fetch daily data from each table for the specific ASIN
        const [salesByDate, adsByDate, trafficByDate] = await Promise.all([
            prisma.piSalesData.groupBy({
                by: ['date'],
                _sum: {
                    orderAmount: true,
                    orderQuantity: true,
                },
                where: dateFilter,
                orderBy: { date: 'asc' },
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
                orderBy: { date: 'asc' },
            }),
            prisma.piGvData.groupBy({
                by: ['date'],
                _sum: {
                    indexedGlanceViews: true,
                    adNumber: true, // Paid GV
                    organicNumber: true, // Organic GV
                },
                where: dateFilter,
                orderBy: { date: 'asc' },
            }),
        ]);

        // Create a map of all unique dates
        const dateMap = new Map<string, Partial<DailyPerformance>>();

        const getEntry = (date: Date) => {
            const dateStr = format(date, 'yyyy-MM-dd');
            if (!dateMap.has(dateStr)) {
                dateMap.set(dateStr, {
                    date: dateStr,
                    overallSales: 0,
                    paidSales: 0,
                    organicSales: 0,
                    totalOrders: 0,
                    paidOrders: 0,
                    organicOrders: 0,
                    glanceViews: 0,
                    paidGlanceViews: 0,
                    organicGlanceViews: 0,
                    impressions: 0,
                    clicks: 0,
                    spend: 0,
                    roas: 0,
                    acos: 0,
                    ctr: 0,
                    cpc: 0,
                    conversionRate: 0,
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

        // Calculate derived metrics for each day
        const dailyPerformance = Array.from(dateMap.values()).map((entry) => {
            const e = entry as DailyPerformance;

            // Round all whole number fields (no decimals)
            e.overallSales = Math.round(e.overallSales ?? 0);
            e.paidSales = Math.round(e.paidSales ?? 0);
            e.organicSales = Math.round((e.overallSales ?? 0) - (e.paidSales ?? 0));
            e.totalOrders = Math.round(e.totalOrders ?? 0);
            e.paidOrders = Math.round(e.paidOrders ?? 0);
            e.organicOrders = Math.round((e.totalOrders ?? 0) - (e.paidOrders ?? 0));
            e.spend = Math.round(e.spend ?? 0);
            e.impressions = Math.round(e.impressions ?? 0);
            e.clicks = Math.round(e.clicks ?? 0);
            e.glanceViews = Math.round(e.glanceViews ?? 0);
            e.paidGlanceViews = Math.round(e.paidGlanceViews ?? 0);
            e.organicGlanceViews = Math.round(e.organicGlanceViews ?? 0);

            // Calculate performance metrics with max 2 decimals
            e.roas = e.spend > 0 ? parseFloat((e.paidSales / e.spend).toFixed(2)) : 0;
            e.acos = e.paidSales > 0 ? parseFloat(((e.spend / e.paidSales) * 100).toFixed(2)) : 0;
            e.ctr = e.impressions > 0 ? parseFloat(((e.clicks / e.impressions) * 100).toFixed(2)) : 0;
            e.cpc = e.clicks > 0 ? parseFloat((e.spend / e.clicks).toFixed(2)) : 0;
            e.conversionRate = e.glanceViews > 0 ? parseFloat(((e.totalOrders / e.glanceViews) * 100).toFixed(2)) : 0;

            return e;
        });

        // Sort by date ascending
        dailyPerformance.sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        res.status(200).json(dailyPerformance);
    } catch (error) {
        console.error('Error fetching ASIN daily performance:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

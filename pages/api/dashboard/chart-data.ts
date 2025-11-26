import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { format } from 'date-fns';

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

        // Fetch daily grouped data from each table
        const [salesByDate, adsByDate, trafficByDate] = await Promise.all([
            prisma.piSalesData.groupBy({
                by: ['date'],
                _sum: {
                    orderAmount: true,
                },
                where: dateFilter,
                orderBy: { date: 'asc' },
            }),
            prisma.adsData.groupBy({
                by: ['date'],
                _sum: {
                    spend: true,
                },
                where: dateFilter,
                orderBy: { date: 'asc' },
            }),
            prisma.piGvData.groupBy({
                by: ['date'],
                _sum: {
                    indexedGlanceViews: true,
                },
                where: dateFilter,
                orderBy: { date: 'asc' },
            }),
        ]);

        // Create a map of all unique dates
        const dateMap = new Map<string, { date: string; sales: number; spend: number; traffic: number }>();

        const addToMap = (date: Date) => {
            const dateStr = format(date, 'yyyy-MM-dd');
            if (!dateMap.has(dateStr)) {
                dateMap.set(dateStr, { date: dateStr, sales: 0, spend: 0, traffic: 0 });
            }
            return dateMap.get(dateStr)!;
        };

        salesByDate.forEach((item: any) => {
            const entry = addToMap(item.date);
            entry.sales = Number(item._sum.orderAmount || 0);
        });

        adsByDate.forEach((item: any) => {
            const entry = addToMap(item.date);
            entry.spend = Number(item._sum.spend || 0);
        });

        trafficByDate.forEach((item: any) => {
            const entry = addToMap(item.date);
            entry.traffic = Number(item._sum.indexedGlanceViews || 0);
        });

        // Convert map to sorted array
        const chartData = Array.from(dateMap.values()).sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        res.status(200).json(chartData);
    } catch (error) {
        console.error('Error fetching chart data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

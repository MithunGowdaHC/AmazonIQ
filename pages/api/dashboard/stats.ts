import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

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

        const [salesData, adsData, trafficData] = await Promise.all([
            prisma.piSalesData.aggregate({
                _sum: {
                    orderAmount: true,
                    orderQuantity: true,
                },
                where: dateFilter,
            }),
            prisma.adsData.aggregate({
                _sum: {
                    spend: true,
                    paidSales: true,
                    impressions: true,
                    clicks: true,
                },
                where: dateFilter,
            }),
            prisma.piGvData.aggregate({
                _sum: {
                    indexedGlanceViews: true,
                    organicNumber: true,
                    adNumber: true,
                },
                where: dateFilter,
            }),
        ]);

        // Round all whole number fields (no decimals)
        const totalSales = Math.round(Number(salesData._sum.orderAmount || 0));
        const adSpend = Math.round(Number(adsData._sum.spend || 0));
        const totalTraffic = Math.round(Number(trafficData._sum.indexedGlanceViews || 0));
        const paidSales = Math.round(Number(adsData._sum.paidSales || 0));
        const organicTraffic = Math.round(Number(trafficData._sum.organicNumber || 0));
        const paidTraffic = Math.round(Number(trafficData._sum.adNumber || 0));
        const impressions = Math.round(Number(adsData._sum.impressions || 0));
        const clicks = Math.round(Number(adsData._sum.clicks || 0));

        // Calculate ratios with max 2 decimals
        const roas = adSpend > 0 ? parseFloat((totalSales / adSpend).toFixed(2)) : 0;
        const acos = totalSales > 0 ? parseFloat(((adSpend / totalSales) * 100).toFixed(2)) : 0;

        res.status(200).json({
            totalSales,
            adSpend,
            totalTraffic,
            roas,
            acos,
            paidSales,
            organicTraffic,
            paidTraffic,
            impressions,
            clicks,
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

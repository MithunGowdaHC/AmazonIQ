import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

interface CompareRequest {
    periods: Array<{
        startDate: string;
        endDate: string;
        label: string;
    }>;
}

interface PeriodAggregates {
    label: string;
    startDate: string;
    endDate: string;
    // Advertising Metrics
    spend: number;
    paidSales: number;
    paidOrders: number;
    impressions: number;
    clicks: number;
    roas: number;
    cvr: number;
    ctr: number;
    cpc: number;
    // Seller Central Metrics
    scSales: number;
    scOrders: number;
    sessions: number;
    pageViews: number;
    refundRate: number;
    // Product Insights Metrics
    glanceViews: number;
    adShare: number;
    organicShare: number;
    overallSales: number;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { periods } = req.body as CompareRequest;

        if (!periods || periods.length === 0) {
            return res.status(400).json({ message: 'No periods provided' });
        }

        const results: PeriodAggregates[] = [];

        for (const period of periods) {
            const startDate = new Date(period.startDate);
            const endDate = new Date(period.endDate);

            // Fetch aggregated data for this period
            const [piSales, adsData, piGvData, scData] = await Promise.all([
                // PI Sales
                prisma.piSalesData.aggregate({
                    _sum: { orderAmount: true, orderQuantity: true },
                    where: { date: { gte: startDate, lte: endDate } }
                }),
                // Ads Data
                prisma.adsData.aggregate({
                    _sum: { spend: true, paidSales: true, impressions: true, clicks: true, paidOrders: true },
                    where: { date: { gte: startDate, lte: endDate } }
                }),
                // PI GV Data - includes adNumber and organicNumber for share calculation
                prisma.piGvData.aggregate({
                    _sum: { indexedGlanceViews: true, adNumber: true, organicNumber: true },
                    where: { date: { gte: startDate, lte: endDate } }
                }),
                // Seller Central Data
                prisma.$queryRawUnsafe(`
                    SELECT 
                        SUM(sessions_total) as sessions,
                        SUM(page_views_total) as page_views,
                        SUM(ordered_product_sales) as sc_sales,
                        SUM(units_ordered) as sc_orders,
                        AVG(refund_rate) as refund_rate
                    FROM seller_central_business_report
                    WHERE date >= $1 AND date <= $2
                `, startDate, endDate) as Promise<any[]>
            ]);

            const spend = Number(adsData._sum.spend || 0);
            const paidSales = Number(adsData._sum.paidSales || 0);
            const paidOrders = Number(adsData._sum.paidOrders || 0);
            const impressions = Number(adsData._sum.impressions || 0);
            const clicks = Number(adsData._sum.clicks || 0);
            const glanceViews = Number(piGvData._sum.indexedGlanceViews || 0);
            const adNumber = Number(piGvData._sum.adNumber || 0);
            const organicNumber = Number(piGvData._sum.organicNumber || 0);
            const scRow = scData[0] || {};

            results.push({
                label: period.label,
                startDate: period.startDate,
                endDate: period.endDate,
                // Advertising Metrics
                spend: Math.round(spend),
                paidSales: Math.round(paidSales),
                paidOrders: Math.round(paidOrders),
                impressions: Math.round(impressions),
                clicks: Math.round(clicks),
                roas: spend > 0 ? parseFloat((paidSales / spend).toFixed(2)) : 0,
                cvr: clicks > 0 ? parseFloat(((paidOrders / clicks) * 100).toFixed(2)) : 0,
                ctr: impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(2)) : 0,
                cpc: clicks > 0 ? parseFloat((spend / clicks).toFixed(2)) : 0,
                // Seller Central Metrics
                scSales: Math.round(Number(scRow.sc_sales || 0)),
                scOrders: Math.round(Number(scRow.sc_orders || 0)),
                sessions: Math.round(Number(scRow.sessions || 0)),
                pageViews: Math.round(Number(scRow.page_views || 0)),
                refundRate: parseFloat((Number(scRow.refund_rate || 0) * 100).toFixed(1)),
                // Product Insights Metrics
                glanceViews: Math.round(glanceViews),
                adShare: glanceViews > 0 ? parseFloat(((adNumber / glanceViews) * 100).toFixed(1)) : 0,
                organicShare: glanceViews > 0 ? parseFloat(((organicNumber / glanceViews) * 100).toFixed(1)) : 0,
                overallSales: Math.round(Number(piSales._sum.orderAmount || 0))
            });
        }

        res.status(200).json(results);
    } catch (error) {
        console.error('Error comparing periods:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

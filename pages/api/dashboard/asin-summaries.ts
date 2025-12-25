import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { AsinSummary } from '../../../types';

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

        // Fetch grouped data by ASIN from all 4 data sources
        const [salesByAsin, adsByAsin, trafficByAsin, scByAsin] = await Promise.all([
            prisma.piSalesData.groupBy({
                by: ['asin', 'itemName', 'brand', 'category'],
                _sum: {
                    orderAmount: true,
                    orderQuantity: true,
                },
                where: dateFilter,
            }),
            prisma.adsData.groupBy({
                by: ['asin'],
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
                by: ['asin'],
                _sum: {
                    indexedGlanceViews: true,
                    adNumber: true, // Paid GV
                    organicNumber: true, // Organic GV
                },
                where: dateFilter,
            }),
            // Seller Central data - using raw SQL for groupBy flexibility
            prisma.$queryRawUnsafe(`
                SELECT 
                    child_asin as asin,
                    SUM(sessions_total) as sessions,
                    SUM(page_views_total) as page_views,
                    SUM(ordered_product_sales) as sc_sales,
                    SUM(units_ordered) as sc_orders,
                    AVG(featured_offer_percentage) as buy_box_pct,
                    AVG(unit_session_percentage) as sc_cvr,
                    AVG(refund_rate) as refund_rate
                FROM seller_central_business_report
                WHERE date >= $1 AND date <= $2
                GROUP BY child_asin
            `, startDate ? new Date(startDate as string) : new Date('2000-01-01'),
                endDate ? new Date(endDate as string) : new Date()),
        ]);

        // Merge data
        const asinMap = new Map<string, Partial<AsinSummary>>();

        // Helper to get or create entry
        const getEntry = (asin: string) => {
            if (!asinMap.has(asin)) {
                asinMap.set(asin, {
                    asin,
                    itemName: asin, // Default to ASIN if name not found
                    brand: 'Unknown',
                    category: 'Unknown',
                    imageUrl: '', // Placeholder
                    accountId: 'Stahl', // Hardcoded for now as per dashboard check
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
                    acos: 0,
                    roas: 0,
                    ctr: 0,
                    cpc: 0,
                    organicTrafficShare: 0,
                    paidTrafficShare: 0,
                    // Seller Central fields
                    sessions: 0,
                    pageViews: 0,
                    scSales: 0,
                    scOrders: 0,
                    buyBoxPercentage: 0,
                    scCvr: 0,
                    refundRate: 0,
                });
            }
            return asinMap.get(asin)!;
        };

        // Process Sales Data
        salesByAsin.forEach((item: any) => {
            if (!item.asin) return;
            const entry = getEntry(item.asin);
            entry.itemName = item.itemName || entry.itemName;
            entry.brand = item.brand || entry.brand;
            entry.category = item.category || entry.category;
            entry.overallSales = Number(item._sum.orderAmount || 0);
            entry.totalOrders = Number(item._sum.orderQuantity || 0);
        });

        // Process Ads Data
        adsByAsin.forEach((item: any) => {
            if (!item.asin) return;
            const entry = getEntry(item.asin);
            entry.spend = Number(item._sum.spend || 0);
            entry.paidSales = Number(item._sum.paidSales || 0);
            entry.paidOrders = Number(item._sum.paidOrders || 0);
            entry.impressions = Number(item._sum.impressions || 0);
            entry.clicks = Number(item._sum.clicks || 0);
        });

        // Process Traffic Data
        trafficByAsin.forEach((item: any) => {
            if (!item.asin) return;
            const entry = getEntry(item.asin);
            entry.glanceViews = Number(item._sum.indexedGlanceViews || 0);
            entry.paidGlanceViews = Number(item._sum.adNumber || 0);
            entry.organicGlanceViews = Number(item._sum.organicNumber || 0);
        });

        // Process Seller Central Data
        (scByAsin as any[]).forEach((item: any) => {
            if (!item.asin) return;
            const entry = getEntry(item.asin);
            entry.sessions = Math.round(Number(item.sessions || 0));
            entry.pageViews = Math.round(Number(item.page_views || 0));
            entry.scSales = Math.round(Number(item.sc_sales || 0));
            entry.scOrders = Math.round(Number(item.sc_orders || 0));
            entry.buyBoxPercentage = parseFloat((Number(item.buy_box_pct || 0) * 100).toFixed(1));
            entry.scCvr = parseFloat((Number(item.sc_cvr || 0) * 100).toFixed(2));
            entry.refundRate = parseFloat((Number(item.refund_rate || 0) * 100).toFixed(1));
        });

        // Calculate Derived Metrics
        const summaries = Array.from(asinMap.values()).map((entry) => {
            const e = entry as AsinSummary;

            // Round all whole number fields (no decimals)
            e.overallSales = Math.round(e.overallSales);
            e.paidSales = Math.round(e.paidSales);
            e.organicSales = Math.round(e.overallSales - e.paidSales);
            e.totalOrders = Math.round(e.totalOrders);
            e.paidOrders = Math.round(e.paidOrders);
            e.organicOrders = Math.round(e.totalOrders - e.paidOrders);
            e.spend = Math.round(e.spend);
            e.impressions = Math.round(e.impressions);
            e.clicks = Math.round(e.clicks);
            e.glanceViews = Math.round(e.glanceViews);
            e.paidGlanceViews = Math.round(e.paidGlanceViews);
            e.organicGlanceViews = Math.round(e.organicGlanceViews);

            // Calculate ratios with max 2 decimals
            e.roas = e.spend > 0 ? parseFloat((e.paidSales / e.spend).toFixed(2)) : 0;
            e.acos = e.paidSales > 0 ? parseFloat(((e.spend / e.paidSales) * 100).toFixed(2)) : 0;
            e.ctr = e.impressions > 0 ? parseFloat(((e.clicks / e.impressions) * 100).toFixed(2)) : 0;
            e.cpc = e.clicks > 0 ? parseFloat((e.spend / e.clicks).toFixed(2)) : 0;

            e.organicTrafficShare = e.glanceViews > 0 ? parseFloat(((e.organicGlanceViews / e.glanceViews) * 100).toFixed(2)) : 0;
            e.paidTrafficShare = e.glanceViews > 0 ? parseFloat(((e.paidGlanceViews / e.glanceViews) * 100).toFixed(2)) : 0;

            return e;
        });

        // Sort by overall sales desc
        summaries.sort((a, b) => b.overallSales - a.overallSales);

        res.status(200).json(summaries);
    } catch (error) {
        console.error('Error fetching ASIN summaries:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

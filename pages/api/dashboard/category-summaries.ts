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

        // Step 1: Get all ASIN mappings with their categories
        const asinMappings = await prisma.asinMapping.findMany({
            select: {
                asin: true,
                category: true,
                subCategory: true,
            },
        });

        // Create a map: asin → category
        const asinToCategoryMap = new Map<string, string>();
        asinMappings.forEach(mapping => {
            if (mapping.category && mapping.asin) {
                asinToCategoryMap.set(mapping.asin, mapping.category);
            }
        });

        // Step 2: Fetch all ASIN-level data (reuse existing logic from asin-summaries)
        const [salesByAsin, adsByAsin, trafficByAsin, scData] = await Promise.all([
            prisma.piSalesData.groupBy({
                by: ['asin'],
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
                    adNumber: true,
                    organicNumber: true,
                },
                where: dateFilter,
            }),
            // Seller Central Data
            prisma.$queryRawUnsafe(`
                SELECT 
                    child_asin as asin,
                    SUM(sessions_total) as sessions,
                    SUM(page_views_total) as page_views,
                    SUM(ordered_product_sales) as sc_sales,
                    SUM(units_ordered) as sc_orders,
                    AVG(refund_rate) as refund_rate
                FROM seller_central_business_report
                WHERE date >= $1 AND date <= $2
                GROUP BY child_asin
            `, new Date(startDate as string), new Date(endDate as string)) as Promise<any[]>
        ]);

        // Step 3: Group by category
        const categoryMap = new Map<string, any>();

        // Helper function to add to category
        const addToCategory = (asin: string | null | undefined, metrics: any) => {
            if (!asin) return;
            const category = asinToCategoryMap.get(asin);
            if (!category) return; // Skip ASINs without category mapping

            if (!categoryMap.has(category)) {
                categoryMap.set(category, {
                    category,
                    asinCount: 0,
                    asins: new Set<string>(),
                    spend: 0,
                    paidSales: 0,
                    paidOrders: 0,
                    impressions: 0,
                    clicks: 0,
                    glanceViews: 0,
                    adGlanceViews: 0,
                    organicGlanceViews: 0,
                    sessions: 0,
                    pageViews: 0,
                    overallSales: 0,
                    scSales: 0,
                    scOrders: 0,
                    refundRate: 0,
                    refundRateCount: 0, // For averaging
                });
            }

            const catData = categoryMap.get(category)!;
            catData.asins.add(asin);
            Object.keys(metrics).forEach(key => {
                if (key !== 'refundRate' && metrics[key] !== undefined && metrics[key] !== null) {
                    catData[key] += Number(metrics[key]);
                }
            });
            // Handle refund rate averaging
            if (metrics.refundRate !== undefined && metrics.refundRate !== null) {
                catData.refundRate += Number(metrics.refundRate);
                catData.refundRateCount++;
            }
        };

        // Aggregate sales data
        salesByAsin.forEach(s => {
            addToCategory(s.asin, {
                overallSales: s._sum.orderAmount || 0,
            });
        });

        // Aggregate ads data
        adsByAsin.forEach(a => {
            addToCategory(a.asin, {
                spend: a._sum.spend || 0,
                paidSales: a._sum.paidSales || 0,
                paidOrders: a._sum.paidOrders || 0,
                impressions: a._sum.impressions || 0,
                clicks: a._sum.clicks || 0,
            });
        });

        // Aggregate traffic data
        trafficByAsin.forEach(t => {
            addToCategory(t.asin, {
                glanceViews: t._sum.indexedGlanceViews || 0,
                adGlanceViews: t._sum.adNumber || 0,
                organicGlanceViews: t._sum.organicNumber || 0,
            });
        });

        // Aggregate seller central data
        scData.forEach((sc: any) => {
            addToCategory(sc.asin, {
                sessions: sc.sessions || 0,
                pageViews: sc.page_views || 0,
                scSales: sc.sc_sales || 0,
                scOrders: sc.sc_orders || 0,
                refundRate: sc.refund_rate || 0,
            });
        });

        // Step 4: Calculate derived metrics and format response
        const categorySummaries = Array.from(categoryMap.values()).map(cat => {
            const asinCount = cat.asins.size;
            const avgRefundRate = cat.refundRateCount > 0 ? cat.refundRate / cat.refundRateCount : 0;

            return {
                category: cat.category,
                asinCount,
                // Advertising Metrics
                spend: Math.round(cat.spend),
                paidSales: Math.round(cat.paidSales),
                paidOrders: cat.paidOrders,
                roas: cat.spend > 0 ? parseFloat((cat.paidSales / cat.spend).toFixed(2)) : 0,
                cpc: cat.clicks > 0 ? parseFloat((cat.spend / cat.clicks).toFixed(2)) : 0,
                impressions: cat.impressions,
                clicks: cat.clicks,
                // Traffic Metrics
                glanceViews: Math.round(cat.glanceViews),
                sessions: Math.round(cat.sessions),
                pageViews: Math.round(cat.pageViews),
                // Sales Metrics
                overallSales: Math.round(cat.overallSales),
                scSales: Math.round(cat.scSales),
                scOrders: Math.round(cat.scOrders),
                refundRate: parseFloat((avgRefundRate * 100).toFixed(1)),
            };
        });

        res.status(200).json(categorySummaries);
    } catch (error) {
        console.error('Error fetching category summaries:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

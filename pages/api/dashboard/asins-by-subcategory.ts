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
        const { startDate, endDate, category, subcategory } = req.query;

        if (!category || !subcategory) {
            return res.status(400).json({ message: 'Category and subcategory parameters are required' });
        }

        const dateFilter: any = {};
        if (startDate && endDate) {
            dateFilter.date = {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string),
            };
        }

        // Get ASINs in this subcategory
        const asinMappings = await prisma.asinMapping.findMany({
            where: {
                category: category as string,
                subCategory: subcategory as string,
            },
            select: {
                asin: true,
                title: true,
                shortTitle: true,
            },
        });

        const asinsInSubcategory = new Set(asinMappings.map(m => m.asin).filter(Boolean));

        if (asinsInSubcategory.size === 0) {
            return res.status(200).json([]);
        }

        // Fetch all data for these ASINs
        const [salesByAsin, adsByAsin, trafficByAsin, scData] = await Promise.all([
            prisma.piSalesData.groupBy({
                by: ['asin'],
                _sum: {
                    orderAmount: true,
                    orderQuantity: true,
                },
                where: {
                    ...dateFilter,
                    asin: { in: Array.from(asinsInSubcategory) },
                },
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
                where: {
                    ...dateFilter,
                    asin: { in: Array.from(asinsInSubcategory) },
                },
            }),
            prisma.piGvData.groupBy({
                by: ['asin'],
                _sum: {
                    indexedGlanceViews: true,
                },
                where: {
                    ...dateFilter,
                    asin: { in: Array.from(asinsInSubcategory) },
                },
            }),
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
                  AND child_asin = ANY($3::text[])
                GROUP BY child_asin
            `, new Date(startDate as string), new Date(endDate as string), Array.from(asinsInSubcategory)) as Promise<any[]>
        ]);

        // Build ASIN summaries
        const asinMap = new Map<string, any>();

        asinMappings.forEach(mapping => {
            if (mapping.asin) {
                asinMap.set(mapping.asin, {
                    asin: mapping.asin,
                    title: mapping.shortTitle || mapping.title || mapping.asin,
                    spend: 0,
                    paidSales: 0,
                    paidOrders: 0,
                    roas: 0,
                    cpc: 0,
                    impressions: 0,
                    clicks: 0,
                    glanceViews: 0,
                    sessions: 0,
                    pageViews: 0,
                    overallSales: 0,
                    scSales: 0,
                    scOrders: 0,
                    refundRate: 0,
                });
            }
        });

        salesByAsin.forEach(s => {
            if (s.asin && asinMap.has(s.asin)) {
                const entry = asinMap.get(s.asin)!;
                entry.overallSales = Math.round(Number(s._sum.orderAmount || 0));
            }
        });

        adsByAsin.forEach(a => {
            if (a.asin && asinMap.has(a.asin)) {
                const entry = asinMap.get(a.asin)!;
                entry.spend = Math.round(Number(a._sum.spend || 0));
                entry.paidSales = Math.round(Number(a._sum.paidSales || 0));
                entry.paidOrders = Number(a._sum.paidOrders || 0);
                entry.impressions = Number(a._sum.impressions || 0);
                entry.clicks = Number(a._sum.clicks || 0);
            }
        });

        trafficByAsin.forEach(t => {
            if (t.asin && asinMap.has(t.asin)) {
                const entry = asinMap.get(t.asin)!;
                entry.glanceViews = Math.round(Number(t._sum.indexedGlanceViews || 0));
            }
        });

        scData.forEach((sc: any) => {
            if (sc.asin && asinMap.has(sc.asin)) {
                const entry = asinMap.get(sc.asin)!;
                entry.sessions = Math.round(Number(sc.sessions || 0));
                entry.pageViews = Math.round(Number(sc.page_views || 0));
                entry.scSales = Math.round(Number(sc.sc_sales || 0));
                entry.scOrders = Math.round(Number(sc.sc_orders || 0));
                entry.refundRate = parseFloat((Number(sc.refund_rate || 0) * 100).toFixed(1));
            }
        });

        // Calculate derived metrics
        const asinSummaries = Array.from(asinMap.values()).map(asin => ({
            ...asin,
            roas: asin.spend > 0 ? parseFloat((asin.paidSales / asin.spend).toFixed(2)) : 0,
            cpc: asin.clicks > 0 ? parseFloat((asin.spend / asin.clicks).toFixed(2)) : 0,
        }));

        res.status(200).json(asinSummaries);
    } catch (error) {
        console.error('Error fetching ASINs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

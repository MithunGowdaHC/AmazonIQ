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

        // Step 1: Get ALL ASINs with their categories and subcategories
        // @ts-ignore - Prisma types not regenerated yet
        const asinMappings = await prisma.asinMapping.findMany({
            select: {
                asin: true,
                category: true,
                subCategory: true,
            },
        });

        const subcategoryToAsinsMap = new Map<string, { category: string; asins: string[] }>();

        asinMappings.forEach((mapping: any) => {
            if (mapping.asin && mapping.category && mapping.subCategory) {
                const key = `${mapping.category}|${mapping.subCategory}`;
                if (!subcategoryToAsinsMap.has(key)) {
                    subcategoryToAsinsMap.set(key, {
                        category: mapping.category,
                        asins: [],
                    });
                }
                subcategoryToAsinsMap.get(key)!.asins.push(mapping.asin);
            }
        });

        if (subcategoryToAsinsMap.size === 0) {
            return res.status(200).json([]);
        }

        const allAsins = Array.from(asinMappings.map((m: any) => m.asin).filter(Boolean) as string[]);

        // Step 2: Fetch aggregated data for all ASINs
        const [salesByAsin, adsByAsin, trafficByAsin, scData] = await Promise.all([
            prisma.piSalesData.groupBy({
                by: ['asin'],
                _sum: {
                    orderAmount: true,
                },
                where: {
                    ...dateFilter,
                    asin: { in: allAsins },
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
                    asin: { in: allAsins },
                },
            }),
            prisma.piGvData.groupBy({
                by: ['asin'],
                _sum: {
                    indexedGlanceViews: true,
                },
                where: {
                    ...dateFilter,
                    asin: { in: allAsins },
                },
            }),
            prisma.$queryRawUnsafe(`
                SELECT 
                    child_asin as asin,
                    SUM(ordered_product_sales) as sc_sales,
                    SUM(units_ordered) as sc_orders,
                    AVG(refund_rate) as refund_rate
                FROM seller_central_business_report
                WHERE date >= $1 AND date <= $2
                  AND child_asin = ANY($3::text[])
                GROUP BY child_asin
            `, new Date(startDate as string), new Date(endDate as string), allAsins) as Promise<any[]>
        ]);

        // Step 3: Aggregate by subcategory
        const subcategoryMetrics = new Map<string, any>();

        subcategoryToAsinsMap.forEach((value, key) => {
            const [category, subcategory] = key.split('|');
            subcategoryMetrics.set(key, {
                category,
                subcategory,
                asinCount: value.asins.length,
                spend: 0,
                paidSales: 0,
                paidOrders: 0,
                impressions: 0,
                clicks: 0,
                glanceViews: 0,
                overallSales: 0,
                scSales: 0,
                scOrders: 0,
                refundRate: 0,
                refundRateCount: 0,
            });
        });

        const addToSubcategory = (asin: string | null | undefined, metrics: any) => {
            if (!asin) return;

            subcategoryToAsinsMap.forEach((value, key) => {
                if (value.asins.includes(asin)) {
                    const subData = subcategoryMetrics.get(key)!;
                    Object.keys(metrics).forEach(metricKey => {
                        if (metricKey !== 'refundRate' && metrics[metricKey] !== undefined && metrics[metricKey] !== null) {
                            subData[metricKey] += Number(metrics[metricKey]);
                        }
                    });
                    if (metrics.refundRate !== undefined && metrics.refundRate !== null) {
                        subData.refundRate += Number(metrics.refundRate);
                        subData.refundRateCount++;
                    }
                }
            });
        };

        salesByAsin.forEach(s => addToSubcategory(s.asin, { overallSales: s._sum.orderAmount || 0 }));
        adsByAsin.forEach(a => addToSubcategory(a.asin, {
            spend: a._sum.spend || 0,
            paidSales: a._sum.paidSales || 0,
            paidOrders: a._sum.paidOrders || 0,
            impressions: a._sum.impressions || 0,
            clicks: a._sum.clicks || 0,
        }));
        trafficByAsin.forEach(t => addToSubcategory(t.asin, {
            glanceViews: t._sum.indexedGlanceViews || 0,
        }));
        scData.forEach((sc: any) => addToSubcategory(sc.asin, {
            scSales: sc.sc_sales || 0,
            scOrders: sc.sc_orders || 0,
            refundRate: sc.refund_rate || 0,
        }));

        // Step 4: Format response
        const subcategories = Array.from(subcategoryMetrics.values()).map(sub => {
            const avgRefundRate = sub.refundRateCount > 0 ? sub.refundRate / sub.refundRateCount : 0;

            return {
                category: sub.category,
                subcategory: sub.subcategory,
                asinCount: sub.asinCount,
                spend: Math.round(sub.spend),
                paidSales: Math.round(sub.paidSales),
                paidOrders: sub.paidOrders,
                impressions: sub.impressions,
                clicks: sub.clicks,
                roas: sub.spend > 0 ? parseFloat((sub.paidSales / sub.spend).toFixed(2)) : 0,
                overallSales: Math.round(sub.overallSales),
                glanceViews: Math.round(sub.glanceViews),
                paidGlanceViews: 0, // Not tracked separately
                organicGlanceViews: 0,
                scSales: Math.round(sub.scSales),
                scOrders: Math.round(sub.scOrders),
                refundRate: parseFloat((avgRefundRate * 100).toFixed(1)),
            };
        });

        res.status(200).json(subcategories);
    } catch (error) {
        console.error('Error fetching all subcategories:', error);
        res.status(500).json({ error: 'Failed to fetch subcategories' });
    }
}

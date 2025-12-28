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
        const { startDate, endDate, category } = req.query;

        if (!category) {
            return res.status(400).json({ message: 'Category parameter is required' });
        }

        const dateFilter: any = {};
        if (startDate && endDate) {
            dateFilter.date = {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string),
            };
        }

        // Step 1: Get ASINs in this category with their subcategories
        const asinMappings = await prisma.asinMapping.findMany({
            where: {
                category: category as string,
            },
            select: {
                asin: true,
                category: true,
                subCategory: true,
            },
        });

        const asinToSubcategoryMap = new Map<string, string>();
        const asinsInCategory = new Set<string>();

        asinMappings.forEach(mapping => {
            if (mapping.asin) {
                asinsInCategory.add(mapping.asin);
                if (mapping.subCategory) {
                    asinToSubcategoryMap.set(mapping.asin, mapping.subCategory);
                }
            }
        });

        if (asinsInCategory.size === 0) {
            return res.status(200).json([]);
        }

        // Step 2: Fetch all data for ASINs in this category
        const [salesByAsin, adsByAsin, trafficByAsin, scData] = await Promise.all([
            prisma.piSalesData.groupBy({
                by: ['asin'],
                _sum: {
                    orderAmount: true,
                    orderQuantity: true,
                },
                where: {
                    ...dateFilter,
                    asin: { in: Array.from(asinsInCategory) },
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
                    asin: { in: Array.from(asinsInCategory) },
                },
            }),
            prisma.piGvData.groupBy({
                by: ['asin'],
                _sum: {
                    indexedGlanceViews: true,
                    adNumber: true,
                    organicNumber: true,
                },
                where: {
                    ...dateFilter,
                    asin: { in: Array.from(asinsInCategory) },
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
            `, new Date(startDate as string), new Date(endDate as string), Array.from(asinsInCategory)) as Promise<any[]>
        ]);

        // Step 3: Group by subcategory
        const subcategoryMap = new Map<string, any>();

        const addToSubcategory = (asin: string | null | undefined, metrics: any) => {
            if (!asin) return;
            const subcategory = asinToSubcategoryMap.get(asin) || 'Uncategorized';

            if (!subcategoryMap.has(subcategory)) {
                subcategoryMap.set(subcategory, {
                    category: category as string,
                    subcategory,
                    asinCount: 0,
                    asins: new Set<string>(),
                    spend: 0,
                    paidSales: 0,
                    paidOrders: 0,
                    impressions: 0,
                    clicks: 0,
                    glanceViews: 0,
                    sessions: 0,
                    pageViews: 0,
                    overallSales: 0,
                    scSales: 0,
                    scOrders: 0,
                    refundRate: 0,
                    refundRateCount: 0,
                });
            }

            const subData = subcategoryMap.get(subcategory)!;
            subData.asins.add(asin);
            Object.keys(metrics).forEach(key => {
                if (key !== 'refundRate' && metrics[key] !== undefined && metrics[key] !== null) {
                    subData[key] += Number(metrics[key]);
                }
            });
            if (metrics.refundRate !== undefined && metrics.refundRate !== null) {
                subData.refundRate += Number(metrics.refundRate);
                subData.refundRateCount++;
            }
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
            sessions: sc.sessions || 0,
            pageViews: sc.page_views || 0,
            scSales: sc.sc_sales || 0,
            scOrders: sc.sc_orders || 0,
            refundRate: sc.refund_rate || 0,
        }));

        // Step 4: Format response
        const subcategorySummaries = Array.from(subcategoryMap.values()).map(sub => {
            const asinCount = sub.asins.size;
            const avgRefundRate = sub.refundRateCount > 0 ? sub.refundRate / sub.refundRateCount : 0;

            return {
                category: sub.category,
                subcategory: sub.subcategory,
                asinCount,
                spend: Math.round(sub.spend),
                paidSales: Math.round(sub.paidSales),
                paidOrders: sub.paidOrders,
                roas: sub.spend > 0 ? parseFloat((sub.paidSales / sub.spend).toFixed(2)) : 0,
                cpc: sub.clicks > 0 ? parseFloat((sub.spend / sub.clicks).toFixed(2)) : 0,
                impressions: sub.impressions,
                clicks: sub.clicks,
                glanceViews: Math.round(sub.glanceViews),
                sessions: Math.round(sub.sessions),
                pageViews: Math.round(sub.pageViews),
                overallSales: Math.round(sub.overallSales),
                scSales: Math.round(sub.scSales),
                scOrders: Math.round(sub.scOrders),
                refundRate: parseFloat((avgRefundRate * 100).toFixed(1)),
            };
        });

        res.status(200).json(subcategorySummaries);
    } catch (error) {
        console.error('Error fetching subcategory summaries:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient();
    try {
        // Test seller central data with raw SQL for more flexibility
        const byAsin = await prisma.$queryRawUnsafe(`
            SELECT 
                child_asin as asin,
                SUM(sessions_total) as total_sessions,
                SUM(page_views_total) as total_page_views,
                SUM(ordered_product_sales) as sc_sales,
                SUM(units_ordered) as sc_orders,
                AVG(featured_offer_percentage) * 100 as avg_buy_box_pct,
                AVG(unit_session_percentage) * 100 as avg_cvr,
                AVG(refund_rate) * 100 as avg_refund_rate
            FROM seller_central_business_report
            GROUP BY child_asin
            ORDER BY SUM(ordered_product_sales) DESC
            LIMIT 5
        `);
        console.log('=== TOP 5 ASINS BY SC SALES ===');
        console.log(JSON.stringify(byAsin, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

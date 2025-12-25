const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const result = await prisma.adsData.aggregate({
        _sum: { paidOrders: true, spend: true, paidSales: true, clicks: true }
    });
    console.log('Paid Orders Sum:', result._sum.paidOrders?.toString() || 'null');
    console.log('Spend Sum:', result._sum.spend?.toString() || 'null');
    console.log('Paid Sales Sum:', result._sum.paidSales?.toString() || 'null');
    console.log('Clicks Sum:', result._sum.clicks?.toString() || 'null');

    // Check a sample row
    const sample = await prisma.adsData.findFirst({
        select: { paidOrders: true, spend: true, paidSales: true }
    });
    console.log('Sample row:', sample);

    await prisma.$disconnect();
}
check();

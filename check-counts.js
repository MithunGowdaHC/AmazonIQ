const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const adsCount = await prisma.adsData.count();
        const piGvCount = await prisma.piGvData.count();
        const piSalesCount = await prisma.piSalesData.count();
        // Use raw query for SC since it's mapped differently or just check generic
        const scCount = await prisma.$queryRaw`SELECT COUNT(*) FROM seller_central_business_report`;

        console.log('AdsData count:', adsCount);
        console.log('PiGvData count:', piGvCount);
        console.log('PiSalesData count:', piSalesCount);
        console.log('SellerCentral count:', scCount[0].count.toString());
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

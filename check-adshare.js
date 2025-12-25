const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const result = await prisma.piGvData.aggregate({
        _sum: { adNumber: true, organicNumber: true, indexedGlanceViews: true }
    });
    console.log('Ad Number Sum:', result._sum.adNumber?.toString() || 'null');
    console.log('Organic Number Sum:', result._sum.organicNumber?.toString() || 'null');
    console.log('Glance Views Sum:', result._sum.indexedGlanceViews?.toString() || 'null');

    // Get sample row
    const sample = await prisma.piGvData.findFirst({
        where: { adNumber: { not: null } },
        select: { adNumber: true, organicNumber: true, indexedGlanceViews: true }
    });
    console.log('Sample with adNumber:', sample);

    await prisma.$disconnect();
}
check();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Prisma Client initialized successfully.');
        await prisma.$disconnect();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

main();

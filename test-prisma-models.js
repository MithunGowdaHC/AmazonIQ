const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('AsinMapping model exists:', !!prisma.asinMapping);
console.log('CampaignMapping model exists:', !!prisma.campaignMapping);

prisma.$disconnect();

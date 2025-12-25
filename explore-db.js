const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function main() {
    const prisma = new PrismaClient();
    let output = '';

    try {
        // Get all tables in public schema
        const tables = await prisma.$queryRawUnsafe(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
        );
        output += '=== ALL TABLES ===\n';
        tables.forEach(t => output += '- ' + t.table_name + '\n');

        // Get columns for seller_central_business_report
        output += '\n\n=== SELLER CENTRAL TABLE COLUMNS ===\n';
        const columns = await prisma.$queryRawUnsafe(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'seller_central_business_report' ORDER BY ordinal_position"
        );
        columns.forEach(c => output += `${c.column_name}: ${c.data_type}\n`);

        // Get sample row
        output += '\n\n=== SAMPLE DATA (1 ROW) ===\n';
        const sample = await prisma.$queryRawUnsafe(
            "SELECT * FROM seller_central_business_report LIMIT 1"
        );
        output += JSON.stringify(sample, null, 2);

        // Get count
        output += '\n\n=== ROW COUNT ===\n';
        const count = await prisma.$queryRawUnsafe(
            "SELECT COUNT(*) as count FROM seller_central_business_report"
        );
        output += 'Total rows: ' + count[0].count;

        // Write to file
        fs.writeFileSync('db-structure.txt', output);
        console.log('Written to db-structure.txt');

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

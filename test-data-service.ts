
import { getAccountDailyPerformance } from './services/dataService';
import { subDays, format } from 'date-fns';

async function test() {
    const endDate = format(new Date(), 'yyyy-MM-dd');
    const startDate = format(subDays(new Date(), 5), 'yyyy-MM-dd');

    console.log(`Fetching data for Stahl from ${startDate} to ${endDate}...`);
    const data = await getAccountDailyPerformance('Stahl', { startDate, endDate });

    console.log(`Received ${data.length} records.`);

    if (data.length > 0) {
        console.log('First record (should be newest):', data[0]);
        console.log('Last record (should be oldest):', data[data.length - 1]);

        // Verify sorting
        const isSorted = data.every((item, i) => {
            if (i === 0) return true;
            return item.date <= data[i - 1].date;
        });
        console.log('Is sorted descending?', isSorted);

        // Verify calculations for the first record
        const d = data[0];
        const calcRoas = d.spend > 0 ? d.paidSales / d.spend : 0;
        const calcCvr = d.glanceViews > 0 ? (d.totalOrders / d.glanceViews) * 100 : 0;

               // Use nullish coalescing to handle potentially undefined values
        console.log('Record ROAS:', d.roas ?? 0, 'Calculated ROAS:', calcRoas);
        console.log('Record CVR:', d.conversionRate, 'Calculated CVR:', calcCvr);

        // Check for undefined before using in calculations
        if (d.roas !== undefined && Math.abs(d.roas - calcRoas) > 0.01) console.error('ROAS mismatch!');
        if (Math.abs(d.conversionRate - calcCvr) > 0.01) console.error('CVR mismatch!');
    }
}

test().catch(console.error);

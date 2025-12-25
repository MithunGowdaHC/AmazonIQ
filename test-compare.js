const fetch = require('node-fetch');

async function test() {
    const response = await fetch('http://localhost:3001/api/dashboard/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            periods: [
                { startDate: '2025-11-01', endDate: '2025-11-30', label: 'Current' },
                { startDate: '2025-10-01', endDate: '2025-10-31', label: 'Compare' }
            ]
        })
    });
    const data = await response.json();
    console.log('Period 1 (Current):');
    console.log('  paidOrders:', data[0]?.paidOrders);
    console.log('  adShare:', data[0]?.adShare);
    console.log('  organicShare:', data[0]?.organicShare);
    console.log('  sessions:', data[0]?.sessions);
    console.log('\nPeriod 2 (Compare):');
    console.log('  paidOrders:', data[1]?.paidOrders);
    console.log('  adShare:', data[1]?.adShare);
    console.log('  organicShare:', data[1]?.organicShare);
    console.log('  sessions:', data[1]?.sessions);
}
test().catch(console.error);


import { Account, DailyPerformance, AsinMetadata } from '../types';
import { subDays, format, addDays } from 'date-fns';

export const ACCOUNTS: Account[] = [
  { id: 'Stahl', name: 'Stahl' },
  { id: 'Samsonite India', name: 'Samsonite India' },
  { id: 'Continental Coffee', name: 'Continental Coffee' },
  { id: 'Tata Retail', name: 'Tata Retail' },
];

export const MOCK_USER = {
  id: 'usr_mock',
  email: 'demo@hiveminds.in',
  name: 'Demo User',
  allowedAccounts: ['Stahl', 'Samsonite India'] 
};

// --- DATA GENERATOR ---

const generateDailyHistory = (asin: string, baseSales: number): DailyPerformance[] => {
    const history: DailyPerformance[] = [];
    const today = new Date();
    // Generate 90 days of data
    for (let i = 90; i >= 0; i--) {
        const date = subDays(today, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        
        // Random fluctuation +/- 30%
        const variance = (Math.random() * 0.6) + 0.7; 
        
        const sales = Math.round(baseSales * variance);
        const spend = Math.round(sales * 0.25); // ~25% ACOS baseline
        const paidSales = Math.round(sales * 0.6); // 60% paid
        const organicSales = sales - paidSales;
        
        const orders = Math.round(sales / 800); // Avg ticket ~800
        const paidOrders = Math.round(paidSales / 800);
        
        const gv = Math.round(orders * 25); // ~4% conversion
        const clicks = Math.round(gv * 0.4);
        const impressions = clicks * 200; // 0.5% CTR
        
        history.push({
            date: dateStr,
            overallSales: sales, // Renamed
            paidSales: paidSales,
            organicSales: organicSales,
            spend: spend,
            totalOrders: orders,
            paidOrders: paidOrders,
            glanceViews: gv,
            clicks: clicks,
            impressions: impressions,
            conversionRate: gv > 0 ? (orders / gv) * 100 : 0
        });
    }
    return history;
};

const ASIN_LIST = [
    { asin: 'B08XYZ1234', name: 'Stahl Hybrid Frypan 24cm', brand: 'Stahl', baseSales: 15000 },
    { asin: 'B09ABC5678', name: 'Stahl Artisan Kadhai 20cm', brand: 'Stahl', baseSales: 12000 },
    { asin: 'B07DEF9012', name: 'Stahl Triply Pressure Cooker', brand: 'Stahl', baseSales: 25000 },
    { asin: 'B05GHI3456', name: 'Stahl Cast Iron Skillet', brand: 'Stahl', baseSales: 8000 },
    { asin: 'B01JKL7890', name: 'Stahl Stainless Steel Saucepot', brand: 'Stahl', baseSales: 5000 },
    
    { asin: 'B0SAM11111', name: 'Samsonite Trolley Bag Large', brand: 'Samsonite India', baseSales: 45000 },
    { asin: 'B0SAM22222', name: 'American Tourister Backpack', brand: 'Samsonite India', baseSales: 12000 },
];

// Flattened database of daily records
export const MOCK_DATABASE: Record<string, { metadata: AsinMetadata, history: DailyPerformance[] }> = {};

ASIN_LIST.forEach(item => {
    MOCK_DATABASE[item.asin] = {
        metadata: {
            asin: item.asin,
            itemName: item.name,
            brand: item.brand,
            category: 'Kitchen',
            accountId: item.brand,
            imageUrl: ''
        },
        history: generateDailyHistory(item.asin, item.baseSales)
    };
});

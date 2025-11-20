import { AsinSummary, DailyPerformance, CampaignPerformance, DateRange } from '../types';
import { MOCK_DATABASE } from './mockData';
import { subDays, differenceInDays, parseISO, format } from 'date-fns';

// --- MOCK IMPLEMENTATION ---

const filterDataByDate = (data: DailyPerformance[], start: string, end: string) => {
    return data.filter(d => d.date >= start && d.date <= end);
};

const aggregateMetrics = (history: DailyPerformance[]) => {
    const sum = history.reduce((acc, curr) => ({
        spend: acc.spend + curr.spend,
        totalSales: acc.totalSales + curr.totalSales,
        paidSales: acc.paidSales + curr.paidSales,
        organicSales: acc.organicSales + curr.organicSales,
        totalOrders: acc.totalOrders + curr.totalOrders,
        paidOrders: acc.paidOrders + curr.paidOrders,
        glanceViews: acc.glanceViews + curr.glanceViews,
        impressions: acc.impressions + curr.impressions,
        clicks: acc.clicks + curr.clicks,
    }), {
        spend: 0, totalSales: 0, paidSales: 0, organicSales: 0, 
        totalOrders: 0, paidOrders: 0, glanceViews: 0, impressions: 0, clicks: 0
    });

    const organicOrders = sum.totalOrders - sum.paidOrders;
    const acos = sum.paidSales > 0 ? (sum.spend / sum.paidSales) * 100 : 0;
    const roas = sum.spend > 0 ? sum.paidSales / sum.spend : 0;
    const ctr = sum.impressions > 0 ? (sum.clicks / sum.impressions) * 100 : 0;
    const cpc = sum.clicks > 0 ? sum.spend / sum.clicks : 0;
    const conversionRate = sum.glanceViews > 0 ? (sum.totalOrders / sum.glanceViews) * 100 : 0;
    
    // Mock GV splits for demo
    const paidGV = Math.round(sum.glanceViews * 0.4);
    const orgGV = sum.glanceViews - paidGV;

    return {
        ...sum,
        organicOrders,
        paidGlanceViews: paidGV,
        organicGlanceViews: orgGV,
        acos,
        roas,
        ctr,
        cpc,
        conversionRate
    };
};

export const getAsinSummaries = async (accountId: string, dateRange: DateRange): Promise<AsinSummary[]> => {
    await new Promise(resolve => setTimeout(resolve, 400)); // Slight delay for realism

    const summaries: AsinSummary[] = [];

    // 1. Calculate Date Ranges for Comparison
    const currentStart = parseISO(dateRange.startDate);
    const currentEnd = parseISO(dateRange.endDate);
    const dayDiff = differenceInDays(currentEnd, currentStart) + 1;
    
    const prevEnd = subDays(currentStart, 1);
    const prevStart = subDays(prevEnd, dayDiff - 1);
    
    const prevStartStr = format(prevStart, 'yyyy-MM-dd');
    const prevEndStr = format(prevEnd, 'yyyy-MM-dd');

    Object.values(MOCK_DATABASE).forEach(entry => {
        if (entry.metadata.accountId !== accountId) return;

        // Current Period Data
        const currentHistory = filterDataByDate(entry.history, dateRange.startDate, dateRange.endDate);
        const currentMetrics = aggregateMetrics(currentHistory);

        // Previous Period Data (for trends)
        const prevHistory = filterDataByDate(entry.history, prevStartStr, prevEndStr);
        const prevMetrics = aggregateMetrics(prevHistory);

        // Calculate Trends (% Change)
        const calculateTrend = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        const trends = {
            spend: calculateTrend(currentMetrics.spend, prevMetrics.spend),
            totalSales: calculateTrend(currentMetrics.totalSales, prevMetrics.totalSales),
            roas: calculateTrend(currentMetrics.roas, prevMetrics.roas),
            glanceViews: calculateTrend(currentMetrics.glanceViews, prevMetrics.glanceViews),
            cpc: calculateTrend(currentMetrics.cpc, prevMetrics.cpc),
            conversionRate: calculateTrend(currentMetrics.conversionRate, prevMetrics.conversionRate)
        };

        summaries.push({
            ...entry.metadata,
            ...currentMetrics,
            paidOrders: currentMetrics.paidOrders,
            organicTrafficShare: currentMetrics.glanceViews > 0 ? (currentMetrics.organicGlanceViews / currentMetrics.glanceViews) * 100 : 0,
            paidTrafficShare: currentMetrics.glanceViews > 0 ? (currentMetrics.paidGlanceViews / currentMetrics.glanceViews) * 100 : 0,
            trends
        });
    });

    return summaries.sort((a, b) => b.totalSales - a.totalSales);
};

export const getAsinDetails = async (asin: string, accountId: string, dateRange: DateRange): Promise<AsinSummary | undefined> => {
    const summaries = await getAsinSummaries(accountId, dateRange);
    return summaries.find(s => s.asin === asin);
};

export const getDailyPerformance = async (asin: string, dateRange: DateRange): Promise<DailyPerformance[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const entry = MOCK_DATABASE[asin];
    if (!entry) return [];
    return filterDataByDate(entry.history, dateRange.startDate, dateRange.endDate);
};

export const getAccountDailyPerformance = async (accountId: string, dateRange: DateRange): Promise<DailyPerformance[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Flatten all ASIN histories for this account
    const accountData: Record<string, DailyPerformance> = {};
    
    Object.values(MOCK_DATABASE).forEach(entry => {
        if (entry.metadata.accountId !== accountId) return;
        
        const filtered = filterDataByDate(entry.history, dateRange.startDate, dateRange.endDate);
        filtered.forEach(day => {
            if (!accountData[day.date]) {
                accountData[day.date] = { ...day, date: day.date };
            } else {
                const acc = accountData[day.date];
                acc.totalSales += day.totalSales;
                acc.paidSales += day.paidSales;
                acc.organicSales += day.organicSales;
                acc.spend += day.spend;
                acc.totalOrders += day.totalOrders;
                acc.paidOrders += day.paidOrders;
                acc.clicks += day.clicks;
                acc.impressions += day.impressions;
                acc.glanceViews += day.glanceViews;
            }
        });
    });

    return Object.values(accountData);
};

export const getCampaigns = async (asin: string, dateRange: DateRange): Promise<CampaignPerformance[]> => {
    return [];
};

export const checkUserAccess = async (email: string, accountId: string): Promise<boolean> => {
    return true;
};
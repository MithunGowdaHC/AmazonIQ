
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
        overallSales: acc.overallSales + curr.overallSales,
        paidSales: acc.paidSales + curr.paidSales,
        organicSales: acc.organicSales + curr.organicSales,
        totalOrders: acc.totalOrders + curr.totalOrders,
        paidOrders: acc.paidOrders + curr.paidOrders,
        glanceViews: acc.glanceViews + curr.glanceViews,
        impressions: acc.impressions + curr.impressions,
        clicks: acc.clicks + curr.clicks,
    }), {
        spend: 0, overallSales: 0, paidSales: 0, organicSales: 0,
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
    try {
        const response = await fetch(`/api/dashboard/asin-summaries?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching ASIN summaries:', error);
        return [];
    }
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
    try {
        const response = await fetch(`/api/account/daily-performance?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
        if (!response.ok) {
            throw new Error('Failed to fetch account daily performance');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching account daily performance:', error);
        return [];
    }
};

export const getCampaigns = async (asin: string, dateRange: DateRange): Promise<CampaignPerformance[]> => {
    return [];
};

export const checkUserAccess = async (email: string, accountId: string): Promise<boolean> => {
    return true;
};

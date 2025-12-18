
import { AsinSummary, DailyPerformance, CampaignPerformance, DateRange } from '../types';

// All data now comes from API endpoints that query the database

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
    try {
        const response = await fetch(`/api/asin/daily-performance?asin=${asin}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
        if (!response.ok) {
            throw new Error('Failed to fetch daily performance data');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching daily performance:', error);
        return [];
    }
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

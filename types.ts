export interface Account {
  id: string;
  name: string;
  logo?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  allowedAccounts: string[]; // List of Account IDs
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface AsinMetadata {
  asin: string;
  itemName: string;
  brand: string;
  imageUrl: string;
  category: string;
  accountId: string;
}

// Corresponds to VIEW: ads_asin_summary + VIEW: asin_total_sales_summary
export interface AsinSummary extends AsinMetadata {
  // Sales
  totalSales: number;
  paidSales: number;
  organicSales: number;
  
  // Orders
  totalOrders: number;
  paidOrders: number;
  organicOrders: number;
  
  // Traffic
  glanceViews: number; // This is "Indexed GV"
  paidGlanceViews: number;
  organicGlanceViews: number;

  impressions: number;
  clicks: number;
  
  // Efficiency
  spend: number;
  acos: number;
  roas: number;
  ctr: number;
  cpc: number;
  
  // Traffic Share
  organicTrafficShare: number; // percentage
  paidTrafficShare: number; // percentage

  // Trends (Percentage change vs previous period)
  trends?: {
    spend: number;
    totalSales: number;
    roas: number;
    glanceViews: number;
    cpc: number;
    conversionRate: number;
  };
}

// Corresponds to VIEW: asin_daily_performance
export interface DailyPerformance {
  date: string;
  spend: number;
  totalSales: number;
  paidSales: number;
  organicSales: number;
  glanceViews: number;
  impressions: number;
  clicks: number;
  totalOrders: number;
  paidOrders: number;
  conversionRate: number;
}

export interface CampaignPerformance {
  id: string;
  campaignName: string;
  portfolio: string;
  adType: 'SP' | 'SD' | 'SB';
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  roas: number;
}
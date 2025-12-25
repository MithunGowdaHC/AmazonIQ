
export interface Account {
  id: string;
  name: string;
  logoUrl?: string;
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
  overallSales: number; // Renamed from totalSales
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

  // Seller Central Metrics (from Business Report)
  sessions?: number;           // Total sessions from SC
  pageViews?: number;          // Total page views from SC
  scSales?: number;            // Ordered Product Sales from SC
  scOrders?: number;           // Units Ordered from SC  
  buyBoxPercentage?: number;   // Featured Offer % from SC
  scCvr?: number;              // Unit Session Percentage from SC (CVR)
  refundRate?: number;         // Refund Rate from SC

  // Trends (Percentage change vs previous period)
  trends?: {
    spend: number;
    overallSales: number; // Renamed from totalSales
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
  overallSales: number; // Renamed from totalSales
  paidSales: number;
  organicSales: number;
  glanceViews: number;
  impressions: number;
  clicks: number;
  totalOrders: number;
  paidOrders: number;
  organicOrders: number;
  conversionRate: number;
  paidGlanceViews?: number;
  organicGlanceViews?: number;
  roas?: number;
  acos?: number;
  cpc?: number;
  ctr?: number;
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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
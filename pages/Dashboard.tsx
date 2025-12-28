
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../services/authContext';
import { getAsinSummaries } from '../services/dataService';
import { AsinSummary } from '../types';
import { Card } from '../components/ui/Card';
import { GoogleDateRangePicker } from '../components/ui/GoogleDateRangePicker';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { subDays, subMonths, subYears, format } from 'date-fns';
import {
    ArrowRight,
    TrendingUp,
    Construction,
    ArrowUpRight,
    ArrowDownRight,
    Download,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    ChevronDown,
    ChevronRight
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

// Formatter
const formatCurrency = (val: number) => {
    return `₹${Math.round(val).toLocaleString()}`;
};

const formatNumber = (val: number) => {
    return Math.round(val).toLocaleString();
};

// New Smart KPI Card - REMOVED Comparison Text as requested
const KPICard: React.FC<{
    title: string;
    value: string;
    trend?: number;
    isInverse?: boolean; // true for ACOS/Spend where down is good
    subValue?: string;
}> = ({ title, value, trend, isInverse = false }) => {
    const isPositive = trend !== undefined ? trend > 0 : false;
    const isGood = isInverse ? !isPositive : isPositive;
    const trendVal = trend !== undefined ? Math.abs(trend).toFixed(1) : '0.0';

    return (
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors shadow-lg shadow-black/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-slate-800/20 to-transparent rounded-bl-full -mr-4 -mt-4 transition-opacity opacity-50 group-hover:opacity-100"></div>

            <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
                {trend !== undefined && (
                    <div className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded cursor-help ${isGood ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {trendVal}%
                    </div>
                )}
            </div>
            <h3 className="text-2xl font-bold text-slate-100 tracking-tight">{value}</h3>
        </div>
    );
};

// In Progress Component
const InProgress: React.FC<{ accountName: string }> = ({ accountName }) => (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center p-4">
        <div className="w-24 h-24 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 relative">
            <div className="absolute inset-0 rounded-full border border-indigo-500/30 animate-ping opacity-20"></div>
            <Construction className="w-10 h-10 text-indigo-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-100 mb-2"> Loading...</h2>
        <p className="text-slate-400 max-w-md mb-6">
            The data pipeline for <span className="text-indigo-400 font-semibold">{accountName}</span> is currently being established.
        </p>
        <div className="text-xs font-mono text-slate-600 bg-slate-900 px-4 py-2 rounded border border-slate-800">
            STATUS: WAITING_FOR_API_INTEGRATION
        </div>
    </div>
);

// Custom Tooltip for Sales Graph
const SalesTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const paid = payload.find((p: any) => p.name === 'Paid Sales')?.value || 0;
        const organic = payload.find((p: any) => p.name === 'Organic Sales')?.value || 0;
        const overall = paid + organic;

        return (
            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl min-w-[180px]">
                <p className="text-xs text-slate-400 font-medium mb-2 border-b border-slate-800 pb-1 truncate max-w-[160px]" title={label}>{label}</p>
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-300">Overall Sales</span>
                        <span className="text-sm font-bold text-white">₹{overall.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-px bg-slate-800 my-1"></div>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                            <span className="text-[10px] text-slate-400">Paid</span>
                        </div>
                        <span className="text-xs font-medium text-indigo-300">₹{paid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                            <span className="text-[10px] text-slate-400">Organic</span>
                        </div>
                        <span className="text-xs font-medium text-slate-300">₹{organic.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

// Sorting Types
type SortKey = keyof AsinSummary | 'cvr';
type SortDirection = 'asc' | 'desc';
interface SortConfig {
    key: SortKey;
    direction: SortDirection;
}

export const Dashboard: React.FC = () => {
    const { selectedAccount } = useAuth();
    const router = useRouter();
    const [data, setData] = useState<AsinSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    // Table State
    const [rowsLimit, setRowsLimit] = useState<string>('All');

    // Sorting State
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'overallSales', direction: 'desc' });

    // Compare Modal State
    const [showCompareModal, setShowCompareModal] = useState(false);
    const [comparePeriod2, setComparePeriod2] = useState<{ type: string; start: string; end: string } | null>(null);
    const [comparePeriod3, setComparePeriod3] = useState<{ type: string; start: string; end: string } | null>(null);
    const [showPeriod3, setShowPeriod3] = useState(false);
    const [comparisonData, setComparisonData] = useState<{ period1?: any; period2?: any; period3?: any }>({});
    const [isComparing, setIsComparing] = useState(false);

    // Hierarchical Table State
    const [categories, setCategories] = useState<any[]>([]);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [subcategoriesByCategory, setSubcategoriesByCategory] = useState<Map<string, any[]>>(new Map());
    const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());
    const [asinsBySubcategory, setAsinsBySubcategory] = useState<Map<string, any[]>>(new Map());
    const [asinsByCategory, setAsinsByCategory] = useState<Map<string, any[]>>(new Map()); // For category+ASIN mode
    const [allSubcategories, setAllSubcategories] = useState<any[]>([]); // For flat subcategory view


    // Hierarchy Level Toggles (all enabled by default for full hierarchy)
    const [showCategories, setShowCategories] = useState(true);
    const [showSubcategories, setShowSubcategories] = useState(true);
    const [showAsins, setShowAsins] = useState(true);

    // Calculate comparison period dates
    const calculatePeriodDates = (type: string): { start: string; end: string } => {
        const start = new Date(startDate);
        const end = new Date(endDate);

        switch (type) {
            case 'yesterday':
                const yesterday = subDays(new Date(), 1);
                return { start: format(yesterday, 'yyyy-MM-dd'), end: format(yesterday, 'yyyy-MM-dd') };
            case 'lastMonth':
                return {
                    start: format(subMonths(start, 1), 'yyyy-MM-dd'),
                    end: format(subMonths(end, 1), 'yyyy-MM-dd')
                };
            case 'lastYear':
                return {
                    start: format(subYears(start, 1), 'yyyy-MM-dd'),
                    end: format(subYears(end, 1), 'yyyy-MM-dd')
                };
            default:
                return { start: '', end: '' };
        }
    };

    // Handle preset selection
    const handlePresetSelect = (period: 2 | 3, type: string) => {
        if (type === 'custom') {
            // Initialize with current dates if switching to custom, or keep existing if already custom
            const current = period === 2 ? comparePeriod2 : comparePeriod3;
            const start = current?.start || startDate;
            const end = current?.end || endDate;

            if (period === 2) {
                setComparePeriod2({ type, start, end });
            } else {
                setComparePeriod3({ type, start, end });
            }
        } else {
            const dates = calculatePeriodDates(type);
            if (period === 2) {
                setComparePeriod2({ type, ...dates });
            } else {
                setComparePeriod3({ type, ...dates });
            }
        }
    };

    // Handle custom date change
    const handleCustomDateChange = (period: 2 | 3, start: string, end: string) => {
        if (period === 2) {
            setComparePeriod2({ type: 'custom', start, end });
        } else {
            setComparePeriod3({ type: 'custom', start, end });
        }
    };

    // Handle compare action
    const handleCompare = async () => {
        if (!comparePeriod2) return;

        setIsComparing(true);
        try {
            const periods = [
                { startDate, endDate, label: 'Current Period' },
                { startDate: comparePeriod2.start, endDate: comparePeriod2.end, label: 'Period 2' }
            ];

            if (comparePeriod3) {
                periods.push({ startDate: comparePeriod3.start, endDate: comparePeriod3.end, label: 'Period 3' });
            }

            const response = await fetch('/api/dashboard/compare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ periods })
            });

            if (response.ok) {
                const results = await response.json();
                setComparisonData({
                    period1: results[0],
                    period2: results[1],
                    period3: results[2] || null
                });
                setShowCompareModal(false);
            }
        } catch (error) {
            console.error('Comparison failed:', error);
        } finally {
            setIsComparing(false);
        }
    };

    // Handle incoming date filters
    // Note: React Router `location.state` logic removed for Next.js migration.
    // If you need to pass forced dates between pages, use query params.

    useEffect(() => {
        if (selectedAccount) {
            if (selectedAccount.id !== 'Stahl') {
                setLoading(false);
                setData([]);
                setCategories([]);
                return;
            }

            setLoading(true);

            // Fetch ASINs (for KPIs), Categories, and All Subcategories
            Promise.all([
                getAsinSummaries(selectedAccount.id, { startDate, endDate }),
                fetch(`/api/dashboard/category-summaries?startDate=${startDate}&endDate=${endDate}`).then(r => r.json()),
                fetch(`/api/dashboard/all-subcategories?startDate=${startDate}&endDate=${endDate}`).then(r => r.json())
            ])
                .then(([asinData, categoryData, allSubcategoryData]) => {
                    setData(asinData); // Keep for top KPIs and ASIN-only view
                    setCategories(categoryData); // For hierarchical table
                    setAllSubcategories(allSubcategoryData); // For flat subcategory view
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setLoading(false);
                });
        }
    }, [selectedAccount, startDate, endDate]);

    const handleDateChange = (start: string, end: string) => {
        setStartDate(start);
        setEndDate(end);
    };

    // Handle category expansion - fetch subcategories or ASINs based on view mode
    const toggleCategory = async (category: string) => {
        const newExpanded = new Set(expandedCategories);
        if (expandedCategories.has(category)) {
            newExpanded.delete(category);
            setExpandedCategories(newExpanded);
        } else {
            newExpanded.add(category);
            setExpandedCategories(newExpanded);

            // If subcategories are shown, fetch them
            if (showSubcategories && !subcategoriesByCategory.has(category)) {
                try {
                    const response = await fetch(`/api/dashboard/subcategory-summaries?category=${encodeURIComponent(category)}&startDate=${startDate}&endDate=${endDate}`);
                    const subcategories = await response.json();
                    setSubcategoriesByCategory(new Map(subcategoriesByCategory).set(category, subcategories));
                } catch (error) {
                    console.error('Error fetching subcategories:', error);
                }
            }

            // If subcategories are hidden but ASINs are shown, fetch ASINs directly for the category
            if (!showSubcategories && showAsins && !asinsByCategory.has(category)) {
                try {
                    // Fetch all ASINs in this category
                    const asinsInCategory = data.filter(asin => {
                        // This is a simplified approach - in production you'd fetch from an API
                        // For now, we'll use the asin-summaries with category filter
                        return true; // Placeholder - will be refined
                    });
                    setAsinsByCategory(new Map(asinsByCategory).set(category, asinsInCategory));
                } catch (error) {
                    console.error('Error fetching ASINs for category:', error);
                }
            }
        }
    };

    // Handle subcategory expansion - fetch ASINs
    const toggleSubcategory = async (category: string, subcategory: string) => {
        const key = `${category}|${subcategory}`;
        const newExpanded = new Set(expandedSubcategories);
        if (expandedSubcategories.has(key)) {
            newExpanded.delete(key);
            setExpandedSubcategories(newExpanded);
        } else {
            newExpanded.add(key);
            setExpandedSubcategories(newExpanded);

            // Fetch ASINs if not already loaded
            if (!asinsBySubcategory.has(key)) {
                try {
                    const response = await fetch(`/api/dashboard/asins-by-subcategory?category=${encodeURIComponent(category)}&subcategory=${encodeURIComponent(subcategory)}&startDate=${startDate}&endDate=${endDate}`);
                    const asins = await response.json();
                    setAsinsBySubcategory(new Map(asinsBySubcategory).set(key, asins));
                } catch (error) {
                    console.error('Error fetching ASINs:', error);
                }
            }
        }
    };

    // Sorting Logic
    const handleSort = (key: SortKey) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
        }));
    };

    const sortedData = useMemo(() => {
        const sorted = [...data];
        const result = sorted.sort((a, b) => {
            let aValue: number | string = 0;
            let bValue: number | string = 0;

            // Helper for derived metrics
            const getCvr = (item: AsinSummary) => item.glanceViews > 0 ? (item.totalOrders / item.glanceViews) * 100 : 0;

            if (sortConfig.key === 'cvr') {
                aValue = getCvr(a);
                bValue = getCvr(b);
            } else {
                // @ts-ignore
                aValue = a[sortConfig.key];
                // @ts-ignore
                bValue = b[sortConfig.key];
            }

            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = (bValue as string).toLowerCase();
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        if (rowsLimit === 'All') return result;
        return result.slice(0, parseInt(rowsLimit));
    }, [data, sortConfig, rowsLimit]);

    // Sorted Categories (for hierarchical table)
    const sortedCategories = useMemo(() => {
        if (categories.length === 0) return [];

        const sorted = [...categories];
        sorted.sort((a, b) => {
            let aValue: number | string = 0;
            let bValue: number | string = 0;

            // Category sorting (simplified - no CVR at category level)
            if (sortConfig.key === 'category' || sortConfig.key === 'itemName') {
                aValue = a.category || '';
                bValue = b.category || '';
            } else {
                // @ts-ignore
                aValue = a[sortConfig.key] || 0;
                // @ts-ignore
                bValue = b[sortConfig.key] || 0;
            }

            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = (bValue as string).toLowerCase();
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }, [categories, sortConfig]);

    // CSV Export
    const exportCSV = () => {
        const headers = [
            "ASIN", "Product Name", "Spends", "Paid Sales", "Orders",
            "Impressions", "Clicks", "ROAS", "CVR", "Overall Sales",
            "Indexed GV", "Paid GV", "Organic GV"
        ];

        const rows = sortedData.map(row => {
            const cvr = row.glanceViews > 0 ? (row.totalOrders / row.glanceViews) * 100 : 0;
            return [
                row.asin,
                `"${row.itemName.replace(/"/g, '""')}"`, // Escape quotes
                row.spend,
                row.paidSales,
                row.totalOrders,
                row.impressions,
                row.clicks,
                row.roas.toFixed(1),
                cvr.toFixed(2) + "%",
                row.overallSales,
                row.glanceViews,
                row.paidGlanceViews,
                row.organicGlanceViews
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Stahl_Dashboard_${startDate}_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
    };

    // Table Header Helper
    const SortIcon = ({ column }: { column: SortKey }) => {
        if (sortConfig.key !== column) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp className="w-3 h-3 ml-1 text-indigo-400" />
            : <ArrowDown className="w-3 h-3 ml-1 text-indigo-400" />;
    };

    const HeaderCell = ({ label, sortKey, align = 'right', color, width }: { label: string, sortKey: SortKey, align?: 'left' | 'right' | 'center', color?: string, width?: string }) => (
        <th
            className={`px-4 py-4 cursor-pointer hover:bg-slate-800 transition-colors select-none group ${align === 'left' ? 'text-left' : align === 'center' ? 'text-center' : 'text-right'} ${color} ${width}`}
            onClick={() => handleSort(sortKey)}
        >
            <div className={`flex items-center ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
                {label}
                <SortIcon column={sortKey} />
            </div>
        </th>
    );

    if (selectedAccount && selectedAccount.id !== 'Stahl') {
        return <InProgress accountName={selectedAccount.name} />;
    }

    // Aggregations
    const overallSales = data.reduce((sum, i) => sum + i.overallSales, 0);
    const totalSpend = data.reduce((sum, i) => sum + i.spend, 0);
    const totalGV = data.reduce((sum, i) => sum + i.glanceViews, 0);
    const totalPaidSales = data.reduce((sum, i) => sum + i.paidSales, 0);
    const totalClicks = data.reduce((sum, i) => sum + i.clicks, 0);
    const totalOrders = data.reduce((sum, i) => sum + i.totalOrders, 0);
    const totalPaidOrders = data.reduce((sum, i) => sum + i.paidOrders, 0);

    const avgRoas = totalSpend > 0 ? totalPaidSales / totalSpend : 0;
    const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const avgCvr = totalClicks > 0 ? (totalPaidOrders / totalClicks) * 100 : 0;

    // Seller Central Aggregations
    const totalScSales = data.reduce((sum, i) => sum + (i.scSales || 0), 0);
    const totalScUnits = data.reduce((sum, i) => sum + (i.scOrders || 0), 0);
    const totalSessions = data.reduce((sum, i) => sum + (i.sessions || 0), 0);
    const totalPageViews = data.reduce((sum, i) => sum + (i.pageViews || 0), 0);
    const avgRefundRate = data.length > 0
        ? data.filter(i => (i.refundRate || 0) > 0).reduce((sum, i) => sum + (i.refundRate || 0), 0) / data.filter(i => (i.refundRate || 0) > 0).length
        : 0;

    // Trends
    const mockTrendSales = data.length > 0 ? data[0].trends?.overallSales : 0;
    const mockTrendSpend = data.length > 0 ? data[0].trends?.spend : 0;
    const mockTrendRoas = data.length > 0 ? data[0].trends?.roas : 0;
    const mockTrendGV = data.length > 0 ? data[0].trends?.glanceViews : 0;
    const mockTrendCPC = data.length > 0 ? data[0].trends?.cpc : 0;
    const mockTrendCVR = data.length > 0 ? data[0].trends?.conversionRate : 0;

    // KPI Section Component for grouped layout
    const KPISection: React.FC<{ title: string; color: string; children: React.ReactNode }> = ({ title, color, children }) => (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <div className={`w-1.5 h-4 rounded-full ${color}`}></div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {children}
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Control Bar */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-100 tracking-tight">Performance Overview</h2>
                    <p className="text-sm text-slate-400 mt-1">
                        Analyzing <span className="text-indigo-400 font-medium">{selectedAccount?.name}</span> data
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <GoogleDateRangePicker startDate={startDate} endDate={endDate} onChange={handleDateChange} />
                    <button
                        onClick={() => setShowCompareModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 3h5v5" /><path d="M8 3H3v5" /><path d="M21 3l-7 7" /><path d="M3 3l7 7" /><path d="M16 21h5v-5" /><path d="M8 21H3v-5" /><path d="M21 21l-7-7" /><path d="M3 21l7-7" />
                        </svg>
                        Compare
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                    <p className="text-sm text-slate-500 font-medium animate-pulse">Aggregating Data Points...</p>
                </div>
            ) : data.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <TrendingUp className="w-8 h-8 text-slate-600" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-300">No data found</h3>
                    <p className="text-slate-500 max-w-md mx-auto mt-2 text-sm">
                        Try adjusting your date range to see performance metrics.
                    </p>
                </div>
            ) : (
                <>
                    {/* Comparison Results - 3 Grouped Blocks */}
                    {comparisonData.period1 && comparisonData.period2 && (
                        <div className="space-y-4">
                            {/* Comparison Header */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-100">Period Comparison</h3>
                                    <p className="text-sm text-slate-400 mt-1">
                                        <span className="text-indigo-400">{comparisonData.period1.startDate} → {comparisonData.period1.endDate}</span>
                                        <span className="mx-2 text-slate-600">vs</span>
                                        <span className="text-emerald-400">{comparisonData.period2.startDate} → {comparisonData.period2.endDate}</span>
                                        {comparisonData.period3 && (
                                            <>
                                                <span className="mx-2 text-slate-600">vs</span>
                                                <span className="text-amber-400">{comparisonData.period3.startDate} → {comparisonData.period3.endDate}</span>
                                            </>
                                        )}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setComparisonData({})}
                                    className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    Clear Comparison
                                </button>
                            </div>

                            {/* 3 Comparison Blocks */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                {/* Block 1: Advertising Metrics */}
                                <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-1.5 h-4 rounded-full bg-rose-500"></div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Advertising</h4>
                                    </div>
                                    {/* Column Headers */}
                                    <div className="flex items-center justify-between text-[10px] text-slate-600 mb-2 pb-1 border-b border-slate-800">
                                        <span>Metric</span>
                                        <div className="flex items-center gap-3">
                                            <span className="w-16 text-right text-indigo-400">Current</span>
                                            <span className="w-16 text-right text-emerald-400">Compare</span>
                                            <span className="w-10 text-right">Δ%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        {[
                                            { label: 'Spends', key: 'spend', format: 'currency', inverse: true },
                                            { label: 'Paid Sales', key: 'paidSales', format: 'currency' },
                                            { label: 'Paid Orders', key: 'paidOrders', format: 'number' },
                                            { label: 'Impressions', key: 'impressions', format: 'number' },
                                            { label: 'Clicks', key: 'clicks', format: 'number' },
                                            { label: 'RoAS', key: 'roas', format: 'decimal' },
                                            { label: 'CVR', key: 'cvr', format: 'percent' },
                                            { label: 'CTR', key: 'ctr', format: 'percent' },
                                            { label: 'CPC', key: 'cpc', format: 'currency', inverse: true },
                                        ].map(({ label, key, format, inverse }) => {
                                            const p1 = comparisonData.period1[key] || 0;
                                            const p2 = comparisonData.period2[key] || 0;
                                            const change = p2 !== 0 ? ((p1 - p2) / p2 * 100) : 0;
                                            const isPositive = inverse ? change < 0 : change > 0;
                                            const fmt = (v: number) => format === 'currency' ? `₹${Math.round(v).toLocaleString()}` : format === 'percent' ? `${v.toFixed(1)}%` : format === 'decimal' ? v.toFixed(2) : Math.round(v).toLocaleString();
                                            return (
                                                <div key={key} className="flex items-center justify-between text-xs">
                                                    <span className="text-slate-500">{label}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-16 text-right text-slate-300 font-medium">{fmt(p1)}</span>
                                                        <span className="w-16 text-right text-slate-500">{fmt(p2)}</span>
                                                        <span className={`w-10 text-right font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {change > 0 ? '+' : ''}{change.toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Block 2: Seller Central Metrics */}
                                <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-1.5 h-4 rounded-full bg-amber-500"></div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Seller Central</h4>
                                    </div>
                                    {/* Column Headers */}
                                    <div className="flex items-center justify-between text-[10px] text-slate-600 mb-2 pb-1 border-b border-slate-800">
                                        <span>Metric</span>
                                        <div className="flex items-center gap-3">
                                            <span className="w-16 text-right text-indigo-400">Current</span>
                                            <span className="w-16 text-right text-emerald-400">Compare</span>
                                            <span className="w-10 text-right">Δ%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        {[
                                            { label: 'Overall Sales (SC)', key: 'scSales', format: 'currency' },
                                            { label: 'Overall Units', key: 'scOrders', format: 'number' },
                                            { label: 'Sessions', key: 'sessions', format: 'number' },
                                            { label: 'Page Views', key: 'pageViews', format: 'number' },
                                            { label: 'Refund Rate', key: 'refundRate', format: 'percent', inverse: true },
                                        ].map(({ label, key, format, inverse }) => {
                                            const p1 = comparisonData.period1[key] || 0;
                                            const p2 = comparisonData.period2[key] || 0;
                                            const change = p2 !== 0 ? ((p1 - p2) / p2 * 100) : 0;
                                            const isPositive = inverse ? change < 0 : change > 0;
                                            const fmt = (v: number) => format === 'currency' ? `₹${Math.round(v).toLocaleString()}` : format === 'percent' ? `${v.toFixed(1)}%` : Math.round(v).toLocaleString();
                                            return (
                                                <div key={key} className="flex items-center justify-between text-xs">
                                                    <span className="text-slate-500">{label}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-16 text-right text-slate-300 font-medium">{fmt(p1)}</span>
                                                        <span className="w-16 text-right text-slate-500">{fmt(p2)}</span>
                                                        <span className={`w-10 text-right font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {change > 0 ? '+' : ''}{change.toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Block 3: Product Insights Metrics */}
                                <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-1.5 h-4 rounded-full bg-emerald-500"></div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amazon PI</h4>
                                    </div>
                                    {/* Column Headers */}
                                    <div className="flex items-center justify-between text-[10px] text-slate-600 mb-2 pb-1 border-b border-slate-800">
                                        <span>Metric</span>
                                        <div className="flex items-center gap-3">
                                            <span className="w-16 text-right text-indigo-400">Current</span>
                                            <span className="w-16 text-right text-emerald-400">Compare</span>
                                            <span className="w-10 text-right">Δ%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        {[
                                            { label: 'Glance Views', key: 'glanceViews', format: 'number' },
                                            { label: 'Ad Share', key: 'adShare', format: 'percent' },
                                            { label: 'Organic Share', key: 'organicShare', format: 'percent' },
                                            { label: 'Overall Sales (PI)', key: 'overallSales', format: 'currency' },
                                        ].map(({ label, key, format }) => {
                                            const p1 = comparisonData.period1[key] || 0;
                                            const p2 = comparisonData.period2[key] || 0;
                                            const change = p2 !== 0 ? ((p1 - p2) / p2 * 100) : 0;
                                            const isPositive = change > 0;
                                            const fmt = (v: number) => format === 'currency' ? `₹${Math.round(v).toLocaleString()}` : format === 'percent' ? `${v.toFixed(1)}%` : Math.round(v).toLocaleString();
                                            return (
                                                <div key={key} className="flex items-center justify-between text-xs">
                                                    <span className="text-slate-500">{label}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-16 text-right text-slate-300 font-medium">{fmt(p1)}</span>
                                                        <span className="w-16 text-right text-slate-500">{fmt(p2)}</span>
                                                        <span className={`w-10 text-right font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {change > 0 ? '+' : ''}{change.toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Grouped KPI Sections */}
                    <div className="space-y-6">
                        {/* Advertising Metrics */}
                        <KPISection title="Advertising Metrics" color="bg-rose-500">
                            <KPICard title="Spends" value={formatCurrency(totalSpend)} trend={mockTrendSpend} isInverse={true} />
                            <KPICard title="Paid Sales" value={formatCurrency(totalPaidSales)} trend={mockTrendSpend} />
                            <KPICard title="RoAS" value={avgRoas.toFixed(1)} trend={mockTrendRoas} />
                            <KPICard title="CPC" value={`₹${avgCpc.toFixed(1)}`} trend={mockTrendCPC} isInverse={true} />
                        </KPISection>

                        {/* Traffic Metrics */}
                        <KPISection title="Traffic Metrics" color="bg-emerald-500">
                            <KPICard title="Glance Views" value={formatNumber(totalGV)} trend={mockTrendGV} subValue="Product Insights" />
                            <KPICard title="Sessions" value={formatNumber(totalSessions)} subValue="Seller Central" />
                            <KPICard title="Page Views" value={formatNumber(totalPageViews)} subValue="Seller Central" />
                        </KPISection>

                        {/* Sales Metrics */}
                        <KPISection title="Sales Metrics" color="bg-amber-500">
                            <KPICard title="Overall Sales (PI)" value={formatCurrency(overallSales)} trend={mockTrendSales} subValue="Product Insights" />
                            <KPICard title="Overall Sales (SC)" value={formatCurrency(totalScSales)} subValue="Seller Central" />
                            <KPICard title="Units Ordered" value={formatNumber(totalScUnits)} subValue="Seller Central" />
                            <KPICard title="Refund Rate" value={`${avgRefundRate.toFixed(1)}%`} isInverse={true} subValue="Seller Central" />
                        </KPISection>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Chart */}
                        <Card title="Sales Distribution" subtitle="Paid vs Organic" className="lg:col-span-2">
                            <div className="h-80 w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.slice(0, 15)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={4}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                        <XAxis dataKey="itemName" tick={false} axisLine={false} />
                                        <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `₹${val.toLocaleString()}`} axisLine={false} tickLine={false} />
                                        <Tooltip content={<SalesTooltip />} cursor={{ fill: '#1e293b', opacity: 0.4 }} />
                                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                        <Bar dataKey="paidSales" name="Paid Sales" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} barSize={20} />
                                        <Bar dataKey="organicSales" name="Organic Sales" stackId="a" fill="#475569" radius={[4, 4, 0, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        {/* Top Performers */}
                        <Card title="Top 5 Movers" subtitle="By Revenue">
                            <div className="space-y-1 mt-2">
                                {[...data].sort((a, b) => b.overallSales - a.overallSales).slice(0, 5).map((asin, idx) => (
                                    <Link href={`/analytics/${asin.asin}`} key={asin.asin} className="flex items-center gap-3 py-3 px-3 hover:bg-slate-800/50 rounded-lg group cursor-pointer transition-all border border-transparent hover:border-slate-700/50">
                                        <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] shrink-0 ${idx === 0 ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30' : 'bg-slate-800 text-slate-500'}`}>#{idx + 1}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-200 truncate group-hover:text-indigo-400 transition-colors">{asin.itemName || asin.asin}</p>
                                            <p className="text-[10px] text-slate-500 font-mono">ASIN: {asin.asin}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-slate-200">{formatCurrency(asin.overallSales)}</p>
                                            {asin.trends && (
                                                <div className={`text-[10px] flex items-center justify-end gap-0.5 ${asin.trends.overallSales > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {asin.trends.overallSales > 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                                                    {Math.abs(asin.trends.overallSales).toFixed(0)}%
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Detailed List with Sorting & Export */}
                    <Card
                        title="Detailed Performance"
                        subtitle="ASIN Level Breakdown"
                        action={
                            <div className="flex items-center gap-3">
                                {/* Hierarchy Level Toggles */}
                                <div className="flex items-center gap-3 px-3 py-1.5 bg-indigo-600/5 rounded-lg border border-indigo-500/20">
                                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">View:</span>
                                    <label className="flex items-center gap-1.5 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={showCategories}
                                            onChange={(e) => setShowCategories(e.target.checked)}
                                            className="w-3.5 h-3.5 rounded border-indigo-500/30 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
                                        />
                                        <span className="text-xs text-slate-300 group-hover:text-indigo-400 transition-colors">Categories</span>
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={showSubcategories}
                                            onChange={(e) => setShowSubcategories(e.target.checked)}
                                            className="w-3.5 h-3.5 rounded border-indigo-500/30 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
                                        />
                                        <span className="text-xs text-slate-300 group-hover:text-emerald-400 transition-colors">Subcategories</span>
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={showAsins}
                                            onChange={(e) => setShowAsins(e.target.checked)}
                                            className="w-3.5 h-3.5 rounded border-indigo-500/30 text-slate-500 focus:ring-slate-500 focus:ring-offset-0 cursor-pointer"
                                        />
                                        <span className="text-xs text-slate-300 group-hover:text-slate-400 transition-colors">ASINs</span>
                                    </label>
                                </div>
                                {/* Rows Limit */}
                                <div className="relative hidden sm:block">
                                    <select
                                        value={rowsLimit}
                                        onChange={(e) => setRowsLimit(e.target.value)}
                                        className="appearance-none bg-slate-800 text-xs font-medium text-slate-200 pl-3 pr-8 py-1.5 rounded-lg border border-slate-700 hover:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer"
                                    >
                                        <option value="10">10 Rows</option>
                                        <option value="25">25 Rows</option>
                                        <option value="50">50 Rows</option>
                                        <option value="All">All Rows</option>
                                    </select>
                                    <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                                <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors border border-slate-700">
                                    <Download className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Export CSV</span>
                                    <span className="sm:hidden">CSV</span>
                                </button>
                            </div>
                        }
                    >
                        <div className="overflow-x-auto -mx-6 scrollbar-hide">
                            <table className="w-full text-left text-sm text-slate-400 whitespace-nowrap">
                                <thead className="bg-slate-950/50 text-[10px] uppercase font-bold text-slate-500 border-y border-slate-800">
                                    <tr>
                                        <HeaderCell label="Product Details" sortKey="itemName" align="left" width="w-64" />
                                        <th className="px-4 py-4 w-24"></th>
                                        <HeaderCell label="Spends" sortKey="spend" />
                                        <HeaderCell label="Paid Sales" sortKey="paidSales" />
                                        <HeaderCell label="Orders" sortKey="totalOrders" />
                                        <HeaderCell label="Impr." sortKey="impressions" />
                                        <HeaderCell label="Clicks" sortKey="clicks" />
                                        <HeaderCell label="RoAS" sortKey="roas" />
                                        <HeaderCell label="CVR" sortKey="cvr" color="text-emerald-500" />
                                        <HeaderCell label="Overall Sales" sortKey="overallSales" color="text-indigo-400" />
                                        <HeaderCell label="Idx GV" sortKey="glanceViews" />
                                        <HeaderCell label="Ad GV" sortKey="paidGlanceViews" />
                                        <HeaderCell label="Org GV" sortKey="organicGlanceViews" />
                                        {/* Seller Central Columns */}
                                        <th className="px-4 py-4 text-right text-amber-500 border-l border-slate-800">SC Sales</th>
                                        <th className="px-4 py-4 text-right text-amber-500">SC Units</th>
                                        <th className="px-4 py-4 text-right text-amber-500">Refund %</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {/* Flat ASIN List (when only ASINs are shown) */}
                                    {!showCategories && !showSubcategories && showAsins && sortedData.map((row) => {
                                        const cvr = row.clicks > 0 ? (row.paidOrders / row.clicks) * 100 : 0;
                                        const paidShare = row.glanceViews > 0 ? (row.paidGlanceViews / row.glanceViews) * 100 : 0;
                                        const orgShare = row.glanceViews > 0 ? (row.organicGlanceViews / row.glanceViews) * 100 : 0;

                                        return (
                                            <tr key={row.asin} className="hover:bg-slate-800/30 transition-colors group text-xs">
                                                <td className="px-6 py-3.5">
                                                    <Link href={`/analytics/${row.asin}`} className="flex flex-col group-hover:text-indigo-400 transition-colors">
                                                        <span className="font-semibold text-slate-300 truncate max-w-[200px]" title={row.itemName}>{row.itemName || row.asin}</span>
                                                        <span className="text-[10px] text-slate-500 font-mono mt-0.5">{row.asin}</span>
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3.5 text-center">
                                                    <Link
                                                        href={`/analytics/${row.asin}`}
                                                        className="flex items-center justify-center gap-1 px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600 hover:text-white text-indigo-400 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all w-full"
                                                    >
                                                        Analyze
                                                        <ArrowRight className="w-3 h-3" />
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3.5 text-right font-medium text-slate-300">₹{Math.round(row.spend).toLocaleString()}</td>
                                                <td className="px-4 py-3.5 text-right text-slate-400">₹{Math.round(row.paidSales).toLocaleString()}</td>
                                                <td className="px-4 py-3.5 text-right">{row.totalOrders}</td>
                                                <td className="px-4 py-3.5 text-right">{Math.round(row.impressions || 0).toLocaleString()}</td>
                                                <td className="px-4 py-3.5 text-right">{Math.round(row.clicks || 0).toLocaleString()}</td>
                                                <td className="px-4 py-3.5 text-right">{row.roas?.toFixed(1) || 0}</td>
                                                <td className="px-4 py-3.5 text-right text-emerald-500">{cvr.toFixed(2)}%</td>
                                                <td className="px-4 py-3.5 text-right font-bold text-indigo-400">₹{Math.round(row.overallSales).toLocaleString()}</td>
                                                <td className="px-4 py-3.5 text-right font-medium text-slate-300">{row.glanceViews?.toLocaleString() || 0}</td>
                                                <td className="px-4 py-3.5 text-right text-slate-500">
                                                    <div>{row.paidGlanceViews?.toLocaleString() || 0}</div>
                                                    <div className="text-[10px] text-slate-600 font-mono">({paidShare.toFixed(0)}%)</div>
                                                </td>
                                                <td className="px-4 py-3.5 text-right text-slate-500">
                                                    <div>{row.organicGlanceViews?.toLocaleString() || 0}</div>
                                                    <div className="text-[10px] text-slate-600 font-mono">({orgShare.toFixed(0)}%)</div>
                                                </td>
                                                <td className="px-4 py-3.5 text-right text-amber-400 border-l border-slate-800">₹{(row.scSales || 0).toLocaleString()}</td>
                                                <td className="px-4 py-3.5 text-right text-amber-400">{(row.scOrders || 0).toLocaleString()}</td>
                                                <td className="px-4 py-3.5 text-right text-amber-400">{(row.refundRate || 0).toFixed(1)}%</td>
                                            </tr>
                                        );
                                    })}


                                    {/* Flat Subcategory List (when subcategories shown without categories) */}
                                    {!showCategories && showSubcategories && allSubcategories.map((subcategory) => {
                                        const subKey = `${subcategory.category}|${subcategory.subcategory}`;
                                        const isExpanded = expandedSubcategories.has(subKey);
                                        const asins = asinsBySubcategory.get(subKey) || [];

                                        return (
                                            <React.Fragment key={subKey}>
                                                {/* Subcategory Row */}
                                                <tr className="hover:bg-slate-800/30 transition-colors group text-xs">
                                                    <td className="px-6 py-3.5">
                                                        {showAsins ? (
                                                            <button
                                                                onClick={() => toggleSubcategory(subcategory.category, subcategory.subcategory)}
                                                                className="flex items-center gap-2 text-left w-full"
                                                            >
                                                                <div className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                                                    <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="font-semibold text-emerald-400 truncate max-w-[200px]">{subcategory.subcategory}</span>
                                                                    <span className="text-[9px] text-slate-600 mt-0.5">{subcategory.category} • {subcategory.asinCount} ASINs</span>
                                                                </div>
                                                            </button>
                                                        ) : (
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-emerald-400 truncate max-w-[200px]">{subcategory.subcategory}</span>
                                                                <span className="text-[9px] text-slate-600 mt-0.5">{subcategory.category} • {subcategory.asinCount} ASINs</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-center">
                                                        <Link
                                                            href={`/analytics/subcategory/${subcategory.category}/${subcategory.subcategory}`}
                                                            className="flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600 hover:text-white text-emerald-400 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all w-full"
                                                        >
                                                            Analyze
                                                            <ArrowRight className="w-3 h-3" />
                                                        </Link>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right font-medium text-slate-300">₹{subcategory.spend?.toLocaleString() || 0}</td>
                                                    <td className="px-4 py-3.5 text-right text-slate-400">₹{subcategory.paidSales?.toLocaleString() || 0}</td>
                                                    <td className="px-4 py-3.5 text-right">{subcategory.paidOrders || 0}</td>
                                                    <td className="px-4 py-3.5 text-right">{subcategory.impressions?.toLocaleString() || 0}</td>
                                                    <td className="px-4 py-3.5 text-right">{subcategory.clicks?.toLocaleString() || 0}</td>
                                                    <td className="px-4 py-3.5 text-right">{subcategory.roas?.toFixed(1) || 0}</td>
                                                    <td className="px-4 py-3.5 text-right text-emerald-500">-</td>
                                                    <td className="px-4 py-3.5 text-right font-bold text-indigo-400">₹{subcategory.overallSales?.toLocaleString() || 0}</td>
                                                    <td className="px-4 py-3.5 text-right font-medium text-slate-300">{subcategory.glanceViews?.toLocaleString() || 0}</td>
                                                    <td className="px-4 py-3.5 text-right text-slate-500">-</td>
                                                    <td className="px-4 py-3.5 text-right text-slate-500">-</td>
                                                    <td className="px-4 py-3.5 text-right text-amber-400 border-l border-slate-800">₹{subcategory.scSales?.toLocaleString() || 0}</td>
                                                    <td className="px-4 py-3.5 text-right text-amber-400">{subcategory.scOrders?.toLocaleString() || 0}</td>
                                                    <td className="px-4 py-3.5 text-right text-amber-400">{subcategory.refundRate?.toFixed(1) || 0}%</td>
                                                </tr>

                                                {/* ASINs under subcategory (when expanded and ASINs enabled) */}
                                                {isExpanded && showAsins && asins.map((asin) => {
                                                    const cvr = asin.clicks > 0 ? (asin.paidOrders / asin.clicks) * 100 : 0;
                                                    const paidShare = asin.glanceViews > 0 ? ((asin.paidGlanceViews || 0) / asin.glanceViews) * 100 : 0;
                                                    const orgShare = asin.glanceViews > 0 ? ((asin.organicGlanceViews || 0) / asin.glanceViews) * 100 : 0;

                                                    return (
                                                        <tr key={asin.asin} className="hover:bg-slate-800/30 transition-colors group text-xs">
                                                            <td className="px-6 py-3.5 pl-16">
                                                                <Link href={`/analytics/${asin.asin}`} className="flex flex-col group-hover:text-indigo-400 transition-colors">
                                                                    <span className="font-medium text-slate-300 truncate max-w-[180px]" title={asin.title}>{asin.title || asin.asin}</span>
                                                                    <span className="text-[9px] text-slate-600 font-mono mt-0.5">{asin.asin}</span>
                                                                </Link>
                                                            </td>
                                                            <td className="px-4 py-3.5 text-center">
                                                                <Link
                                                                    href={`/analytics/${asin.asin}`}
                                                                    className="flex items-center justify-center gap-1 px-2 py-1 bg-slate-700/30 hover:bg-indigo-600 hover:text-white text-slate-400 rounded text-[9px] font-bold uppercase tracking-wide transition-all"
                                                                >
                                                                    Analyze
                                                                    <ArrowRight className="w-2.5 h-2.5" />
                                                                </Link>
                                                            </td>
                                                            <td className="px-4 py-3.5 text-right text-slate-400">₹{Math.round(asin.spend || 0).toLocaleString()}</td>
                                                            <td className="px-4 py-3.5 text-right text-slate-500">₹{Math.round(asin.paidSales || 0).toLocaleString()}</td>
                                                            <td className="px-4 py-3.5 text-right text-slate-500">{asin.paidOrders || 0}</td>
                                                            <td className="px-4 py-3.5 text-right text-slate-500">{Math.round(asin.impressions || 0).toLocaleString()}</td>
                                                            <td className="px-4 py-3.5 text-right text-slate-500">{Math.round(asin.clicks || 0).toLocaleString()}</td>
                                                            <td className="px-4 py-3.5 text-right text-slate-500">{asin.roas?.toFixed(1) || 0}</td>
                                                            <td className="px-4 py-3.5 text-right text-emerald-500">{cvr.toFixed(2)}%</td>
                                                            <td className="px-4 py-3.5 text-right text-indigo-300">₹{Math.round(asin.overallSales || 0).toLocaleString()}</td>
                                                            <td className="px-4 py-3.5 text-right text-slate-400">{asin.glanceViews?.toLocaleString() || 0}</td>
                                                            <td className="px-4 py-3.5 text-right text-slate-600">
                                                                <div>{(asin.paidGlanceViews || 0).toLocaleString()}</div>
                                                                <div className="text-[9px] text-slate-700 font-mono">({paidShare.toFixed(0)}%)</div>
                                                            </td>
                                                            <td className="px-4 py-3.5 text-right text-slate-600">
                                                                <div>{(asin.organicGlanceViews || 0).toLocaleString()}</div>
                                                                <div className="text-[9px] text-slate-700 font-mono">({orgShare.toFixed(0)}%)</div>
                                                            </td>
                                                            <td className="px-4 py-3.5 text-right text-amber-400 border-l border-slate-800">₹{(asin.scSales || 0).toLocaleString()}</td>
                                                            <td className="px-4 py-3.5 text-right text-amber-400">{(asin.scOrders || 0).toLocaleString()}</td>
                                                            <td className="px-4 py-3.5 text-right text-amber-400">{(asin.refundRate || 0).toFixed(1)}%</td>
                                                        </tr>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    })}

                                    {/* Hierarchical Mode (when categories are enabled) */}
                                    {showCategories && sortedCategories.map((category) => {
                                        const isExpanded = expandedCategories.has(category.category);
                                        const subcategories = subcategoriesByCategory.get(category.category) || [];

                                        return (
                                            <React.Fragment key={category.category}>
                                                {/* Category Row */}
                                                <tr className="hover:bg-slate-800/30 transition-colors group text-xs bg-slate-900/30">
                                                    <td className="px-6 py-3.5">
                                                        <button
                                                            onClick={() => toggleCategory(category.category)}
                                                            className="flex items-center gap-2 text-left w-full"
                                                        >
                                                            <div className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                                                <ChevronRight className="w-4 h-4 text-slate-400" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-indigo-400 truncate max-w-[200px]">{category.category}</span>
                                                                <span className="text-[10px] text-slate-500 mt-0.5">{category.asinCount} ASINs</span>
                                                            </div>
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-center">
                                                        <Link
                                                            href={`/analytics/category/${category.category}`}
                                                            className="flex items-center justify-center gap-1 px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600 hover:text-white text-indigo-400 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all w-full"
                                                        >
                                                            Analyze
                                                            <ArrowRight className="w-3 h-3" />
                                                        </Link>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right font-medium text-slate-300">₹{category.spend?.toLocaleString() || 0}</td>
                                                    <td className="px-4 py-3.5 text-right text-slate-400">₹{category.paidSales?.toLocaleString() || 0}</td>
                                                    <td className="px-4 py-3.5 text-right">{category.paidOrders || 0}</td>
                                                    <td className="px-4 py-3.5 text-right">{category.impressions?.toLocaleString() || 0}</td>
                                                    <td className="px-4 py-3.5 text-right">{category.clicks?.toLocaleString() || 0}</td>
                                                    <td className="px-4 py-3.5 text-right">{category.roas?.toFixed(1) || 0}</td>
                                                    <td className="px-4 py-3.5 text-right text-emerald-500">-</td>
                                                    <td className="px-4 py-3.5 text-right font-bold text-indigo-400">₹{category.overallSales?.toLocaleString() || 0}</td>
                                                    <td className="px-4 py-3.5 text-right font-medium text-slate-300">{category.glanceViews?.toLocaleString() || 0}</td>
                                                    <td className="px-4 py-3.5 text-right text-slate-500">-</td>
                                                    <td className="px-4 py-3.5 text-right text-slate-500">-</td>
                                                    <td className="px-4 py-3.5 text-right text-amber-400 border-l border-slate-800">₹{category.scSales?.toLocaleString() || 0}</td>
                                                    <td className="px-4 py-3.5 text-right text-amber-400">{category.scOrders?.toLocaleString() || 0}</td>
                                                    <td className="px-4 py-3.5 text-right text-amber-400">{category.refundRate?.toFixed(1) || 0}%</td>
                                                </tr>

                                                {/* Subcategory Rows (when category is expanded) */}
                                                {isExpanded && showSubcategories && subcategories.map((subcategory) => {
                                                    const subKey = `${category.category}|${subcategory.subcategory}`;
                                                    const isSubExpanded = expandedSubcategories.has(subKey);
                                                    const asins = asinsBySubcategory.get(subKey) || [];

                                                    return (
                                                        <React.Fragment key={subKey}>
                                                            {/* Subcategory Row */}
                                                            <tr className="hover:bg-slate-800/20 transition-colors group text-xs bg-slate-800/10">
                                                                <td className="px-6 py-3.5 pl-12">
                                                                    <button
                                                                        onClick={() => toggleSubcategory(category.category, subcategory.subcategory)}
                                                                        className="flex items-center gap-2 text-left w-full"
                                                                    >
                                                                        <div className={`transition-transform ${isSubExpanded ? 'rotate-90' : ''}`}>
                                                                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <span className="font-semibold text-emerald-400 truncate max-w-[180px]">{subcategory.subcategory}</span>
                                                                            <span className="text-[9px] text-slate-600 mt-0.5">{subcategory.asinCount} ASINs</span>
                                                                        </div>
                                                                    </button>
                                                                </td>
                                                                <td className="px-4 py-3.5 text-center">
                                                                    <Link
                                                                        href={`/analytics/subcategory/${category.category}/${subcategory.subcategory}`}
                                                                        className="flex items-center justify-center gap-1 px-2 py-1 bg-emerald-600/10 hover:bg-emerald-600 hover:text-white text-emerald-400 rounded text-[9px] font-bold uppercase tracking-wide transition-all"
                                                                    >
                                                                        Analyze
                                                                        <ArrowRight className="w-2.5 h-2.5" />
                                                                    </Link>
                                                                </td>
                                                                <td className="px-4 py-3.5 text-right font-medium text-slate-400">₹{subcategory.spend?.toLocaleString() || 0}</td>
                                                                <td className="px-4 py-3.5 text-right text-slate-500">₹{subcategory.paidSales?.toLocaleString() || 0}</td>
                                                                <td className="px-4 py-3.5 text-right">{subcategory.paidOrders || 0}</td>
                                                                <td className="px-4 py-3.5 text-right">{subcategory.impressions?.toLocaleString() || 0}</td>
                                                                <td className="px-4 py-3.5 text-right">{subcategory.clicks?.toLocaleString() || 0}</td>
                                                                <td className="px-4 py-3.5 text-right">{subcategory.roas?.toFixed(1) || 0}</td>
                                                                <td className="px-4 py-3.5 text-right text-emerald-500">-</td>
                                                                <td className="px-4 py-3.5 text-right font-semibold text-indigo-300">₹{subcategory.overallSales?.toLocaleString() || 0}</td>
                                                                <td className="px-4 py-3.5 text-right font-medium text-slate-400">{subcategory.glanceViews?.toLocaleString() || 0}</td>
                                                                <td className="px-4 py-3.5 text-right text-slate-600">-</td>
                                                                <td className="px-4 py-3.5 text-right text-slate-600">-</td>
                                                                <td className="px-4 py-3.5 text-right text-amber-300 border-l border-slate-800">₹{subcategory.scSales?.toLocaleString() || 0}</td>
                                                                <td className="px-4 py-3.5 text-right text-amber-300">{subcategory.scOrders?.toLocaleString() || 0}</td>
                                                                <td className="px-4 py-3.5 text-right text-amber-300">{subcategory.refundRate?.toFixed(1) || 0}%</td>
                                                            </tr>

                                                            {/* ASIN Rows (when subcategory is expanded) */}
                                                            {isSubExpanded && showAsins && asins.map((asin) => {
                                                                const cvr = asin.clicks > 0 ? (asin.paidOrders / asin.clicks) * 100 : 0;
                                                                const paidShare = asin.glanceViews > 0 ? ((asin.paidGlanceViews || 0) / asin.glanceViews) * 100 : 0;
                                                                const orgShare = asin.glanceViews > 0 ? ((asin.organicGlanceViews || 0) / asin.glanceViews) * 100 : 0;

                                                                return (
                                                                    <tr key={asin.asin} className="hover:bg-slate-800/30 transition-colors group text-xs">
                                                                        <td className="px-6 py-3.5 pl-20">
                                                                            <Link href={`/analytics/${asin.asin}`} className="flex flex-col group-hover:text-indigo-400 transition-colors">
                                                                                <span className="font-medium text-slate-300 truncate max-w-[160px]" title={asin.title}>{asin.title || asin.asin}</span>
                                                                                <span className="text-[9px] text-slate-600 font-mono mt-0.5">{asin.asin}</span>
                                                                            </Link>
                                                                        </td>
                                                                        <td className="px-4 py-3.5 text-center">
                                                                            <Link
                                                                                href={`/analytics/${asin.asin}`}
                                                                                className="flex items-center justify-center gap-1 px-2 py-1 bg-slate-700/30 hover:bg-indigo-600 hover:text-white text-slate-400 rounded text-[9px] font-bold uppercase tracking-wide transition-all"
                                                                            >
                                                                                Analyze
                                                                                <ArrowRight className="w-2.5 h-2.5" />
                                                                            </Link>
                                                                        </td>
                                                                        <td className="px-4 py-3.5 text-right text-slate-400">₹{Math.round(asin.spend || 0).toLocaleString()}</td>
                                                                        <td className="px-4 py-3.5 text-right text-slate-500">₹{Math.round(asin.paidSales || 0).toLocaleString()}</td>
                                                                        <td className="px-4 py-3.5 text-right text-slate-500">{asin.paidOrders || 0}</td>
                                                                        <td className="px-4 py-3.5 text-right text-slate-500">{Math.round(asin.impressions || 0).toLocaleString()}</td>
                                                                        <td className="px-4 py-3.5 text-right text-slate-500">{Math.round(asin.clicks || 0).toLocaleString()}</td>
                                                                        <td className="px-4 py-3.5 text-right text-slate-500">{asin.roas?.toFixed(1) || 0}</td>
                                                                        <td className="px-4 py-3.5 text-right text-emerald-500">{cvr.toFixed(2)}%</td>
                                                                        <td className="px-4 py-3.5 text-right text-indigo-300">₹{Math.round(asin.overallSales || 0).toLocaleString()}</td>
                                                                        <td className="px-4 py-3.5 text-right text-slate-400">{asin.glanceViews?.toLocaleString() || 0}</td>
                                                                        <td className="px-4 py-3.5 text-right text-slate-600">
                                                                            <div>{(asin.paidGlanceViews || 0).toLocaleString()}</div>
                                                                            <div className="text-[9px] text-slate-700 font-mono">({paidShare.toFixed(0)}%)</div>
                                                                        </td>
                                                                        <td className="px-4 py-3.5 text-right text-slate-600">
                                                                            <div>{(asin.organicGlanceViews || 0).toLocaleString()}</div>
                                                                            <div className="text-[9px] text-slate-700 font-mono">({orgShare.toFixed(0)}%)</div>
                                                                        </td>
                                                                        <td className="px-4 py-3.5 text-right text-amber-400 border-l border-slate-800">₹{(asin.scSales || 0).toLocaleString()}</td>
                                                                        <td className="px-4 py-3.5 text-right text-amber-400">{(asin.scOrders || 0).toLocaleString()}</td>
                                                                        <td className="px-4 py-3.5 text-right text-amber-400">{(asin.refundRate || 0).toFixed(1)}%</td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </React.Fragment>
                                                    );
                                                })}\

                                                {/* ASINs directly under category (when subcategories are hidden) */}
                                                {isExpanded && !showSubcategories && showAsins && (() => {
                                                    const categoryAsins = asinsByCategory.get(category.category) || [];
                                                    return categoryAsins.map((asin) => {
                                                        const cvr = asin.clicks > 0 ? (asin.paidOrders / asin.clicks) * 100 : 0;
                                                        const paidShare = asin.glanceViews > 0 ? ((asin.paidGlanceViews || 0) / asin.glanceViews) * 100 : 0;
                                                        const orgShare = asin.glanceViews > 0 ? ((asin.organicGlanceViews || 0) / asin.glanceViews) * 100 : 0;

                                                        return (
                                                            <tr key={asin.asin} className="hover:bg-slate-800/30 transition-colors group text-xs">
                                                                <td className="px-6 py-3.5 pl-12">
                                                                    <Link href={`/analytics/${asin.asin}`} className="flex flex-col group-hover:text-indigo-400 transition-colors">
                                                                        <span className="font-medium text-slate-300 truncate max-w-[180px]" title={asin.itemName}>{asin.itemName || asin.asin}</span>
                                                                        <span className="text-[9px] text-slate-600 font-mono mt-0.5">{asin.asin}</span>
                                                                    </Link>
                                                                </td>
                                                                <td className="px-4 py-3.5 text-center">
                                                                    <Link
                                                                        href={`/analytics/${asin.asin}`}
                                                                        className="flex items-center justify-center gap-1 px-2 py-1 bg-slate-700/30 hover:bg-indigo-600 hover:text-white text-slate-400 rounded text-[9px] font-bold uppercase tracking-wide transition-all"
                                                                    >
                                                                        Analyze
                                                                        <ArrowRight className="w-2.5 h-2.5" />
                                                                    </Link>
                                                                </td>
                                                                <td className="px-4 py-3.5 text-right text-slate-400">₹{Math.round(asin.spend || 0).toLocaleString()}</td>
                                                                <td className="px-4 py-3.5 text-right text-slate-500">₹{Math.round(asin.paidSales || 0).toLocaleString()}</td>
                                                                <td className="px-4 py-3.5 text-right text-slate-500">{asin.totalOrders || asin.paidOrders || 0}</td>
                                                                <td className="px-4 py-3.5 text-right text-slate-500">{Math.round(asin.impressions || 0).toLocaleString()}</td>
                                                                <td className="px-4 py-3.5 text-right text-slate-500">{Math.round(asin.clicks || 0).toLocaleString()}</td>
                                                                <td className="px-4 py-3.5 text-right text-slate-500">{asin.roas?.toFixed(1) || 0}</td>
                                                                <td className="px-4 py-3.5 text-right text-emerald-500">{cvr.toFixed(2)}%</td>
                                                                <td className="px-4 py-3.5 text-right text-indigo-300">₹{Math.round(asin.overallSales || 0).toLocaleString()}</td>
                                                                <td className="px-4 py-3.5 text-right text-slate-400">{asin.glanceViews?.toLocaleString() || 0}</td>
                                                                <td className="px-4 py-3.5 text-right text-slate-600">
                                                                    <div>{(asin.paidGlanceViews || 0).toLocaleString()}</div>
                                                                    <div className="text-[9px] text-slate-700 font-mono">({paidShare.toFixed(0)}%)</div>
                                                                </td>
                                                                <td className="px-4 py-3.5 text-right text-slate-600">
                                                                    <div>{(asin.organicGlanceViews || 0).toLocaleString()}</div>
                                                                    <div className="text-[9px] text-slate-700 font-mono">({orgShare.toFixed(0)}%)</div>
                                                                </td>
                                                                <td className="px-4 py-3.5 text-right text-amber-400 border-l border-slate-800">₹{(asin.scSales || 0).toLocaleString()}</td>
                                                                <td className="px-4 py-3.5 text-right text-amber-400">{(asin.scOrders || 0).toLocaleString()}</td>
                                                                <td className="px-4 py-3.5 text-right text-amber-400">{(asin.refundRate || 0).toFixed(1)}%</td>
                                                            </tr>
                                                        );
                                                    });
                                                })()}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}

            {/* Compare Modal */}
            {showCompareModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-800">
                            <div>
                                <h2 className="text-xl font-bold text-slate-100">Compare Periods</h2>
                                <p className="text-sm text-slate-400 mt-1">Select up to 3 periods to compare performance metrics</p>
                            </div>
                            <button
                                onClick={() => setShowCompareModal(false)}
                                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-6">
                            {/* Period 1 - Current (Fixed) */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                                    <span className="text-sm font-medium text-slate-300">Period 1 (Current)</span>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                                    <p className="text-sm text-slate-200">{startDate} to {endDate}</p>
                                    <p className="text-xs text-slate-500 mt-1">Currently selected range</p>
                                </div>
                            </div>

                            {/* Period 2 */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                    <span className="text-sm font-medium text-slate-300">Period 2 (Comparison)</span>
                                    {comparePeriod2 && (
                                        <span className="text-xs text-emerald-400 ml-2">
                                            {comparePeriod2.start} to {comparePeriod2.end}
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => handlePresetSelect(2, 'yesterday')}
                                        className={`px-4 py-3 rounded-lg text-sm text-slate-200 transition-colors border text-left ${comparePeriod2?.type === 'yesterday' ? 'bg-emerald-600/20 border-emerald-500' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-emerald-500/50'}`}
                                    >
                                        <span className="block font-medium">Yesterday</span>
                                        <span className="block text-xs text-slate-500 mt-1">Previous day's data</span>
                                    </button>
                                    <button
                                        onClick={() => handlePresetSelect(2, 'lastMonth')}
                                        className={`px-4 py-3 rounded-lg text-sm text-slate-200 transition-colors border text-left ${comparePeriod2?.type === 'lastMonth' ? 'bg-emerald-600/20 border-emerald-500' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-emerald-500/50'}`}
                                    >
                                        <span className="block font-medium">Same Period Last Month</span>
                                        <span className="block text-xs text-slate-500 mt-1">Same days, previous month</span>
                                    </button>
                                    <button
                                        onClick={() => handlePresetSelect(2, 'lastYear')}
                                        className={`px-4 py-3 rounded-lg text-sm text-slate-200 transition-colors border text-left ${comparePeriod2?.type === 'lastYear' ? 'bg-emerald-600/20 border-emerald-500' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-emerald-500/50'}`}
                                    >
                                        <span className="block font-medium">Same Period Last Year</span>
                                        <span className="block text-xs text-slate-500 mt-1">Same days, previous year</span>
                                    </button>
                                    <button
                                        onClick={() => handlePresetSelect(2, 'custom')}
                                        className={`px-4 py-3 rounded-lg text-sm text-slate-200 transition-colors border text-left flex flex-col justify-center ${comparePeriod2?.type === 'custom' ? 'bg-indigo-600/20 border-indigo-500' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-indigo-500/50'}`}
                                    >
                                        <span className="block font-medium">Custom Range</span>
                                        <span className="block text-xs text-slate-500 mt-1">Select specific dates</span>
                                    </button>
                                </div>
                                {comparePeriod2?.type === 'custom' && (
                                    <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-indigo-500/30">
                                        <p className="text-xs font-bold text-indigo-400 uppercase mb-2">Select Custom Range</p>
                                        <GoogleDateRangePicker
                                            startDate={comparePeriod2.start}
                                            endDate={comparePeriod2.end}
                                            onChange={(s, e) => handleCustomDateChange(2, s, e)}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Period 3 (Optional) */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                        <span className="text-sm font-medium text-slate-300">Period 3 (Optional)</span>
                                        {comparePeriod3 && (
                                            <span className="text-xs text-amber-400 ml-2">
                                                {comparePeriod3.start} to {comparePeriod3.end}
                                            </span>
                                        )}
                                    </div>
                                    {!showPeriod3 ? (
                                        <button
                                            onClick={() => setShowPeriod3(true)}
                                            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                        >
                                            + Add third period
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => { setShowPeriod3(false); setComparePeriod3(null); }}
                                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                                {showPeriod3 && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => handlePresetSelect(3, 'yesterday')}
                                            className={`px-4 py-3 rounded-lg text-sm text-slate-200 transition-colors border text-left ${comparePeriod3?.type === 'yesterday' ? 'bg-amber-600/20 border-amber-500' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-amber-500/50'}`}
                                        >
                                            <span className="block font-medium">Yesterday</span>
                                        </button>
                                        <button
                                            onClick={() => handlePresetSelect(3, 'lastMonth')}
                                            className={`px-4 py-3 rounded-lg text-sm text-slate-200 transition-colors border text-left ${comparePeriod3?.type === 'lastMonth' ? 'bg-amber-600/20 border-amber-500' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-amber-500/50'}`}
                                        >
                                            <span className="block font-medium">Same Period Last Month</span>
                                        </button>
                                        <button
                                            onClick={() => handlePresetSelect(3, 'lastYear')}
                                            className={`px-4 py-3 rounded-lg text-sm text-slate-200 transition-colors border text-left ${comparePeriod3?.type === 'lastYear' ? 'bg-amber-600/20 border-amber-500' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-amber-500/50'}`}
                                        >
                                            <span className="block font-medium">Same Period Last Year</span>
                                        </button>
                                        <button
                                            onClick={() => handlePresetSelect(3, 'custom')}
                                            className={`px-4 py-3 rounded-lg text-sm text-slate-200 transition-colors border text-left flex flex-col justify-center ${comparePeriod3?.type === 'custom' ? 'bg-amber-600/20 border-amber-500' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-amber-500/50'}`}
                                        >
                                            <span className="block font-medium">Custom Range</span>
                                        </button>
                                    </div>
                                )}
                                {showPeriod3 && comparePeriod3?.type === 'custom' && (
                                    <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-amber-500/30">
                                        <p className="text-xs font-bold text-amber-400 uppercase mb-2">Select Custom Range</p>
                                        <GoogleDateRangePicker
                                            startDate={comparePeriod3.start}
                                            endDate={comparePeriod3.end}
                                            onChange={(s, e) => handleCustomDateChange(3, s, e)}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-800">
                            <button
                                onClick={() => setShowCompareModal(false)}
                                className="px-4 py-2 text-slate-400 hover:text-slate-200 text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCompare}
                                disabled={!comparePeriod2 || isComparing}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                            >
                                {isComparing && (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                )}
                                {isComparing ? 'Comparing...' : 'Compare Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;

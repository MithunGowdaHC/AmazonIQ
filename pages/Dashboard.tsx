
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../services/authContext';
import { getAsinSummaries } from '../services/dataService';
import { AsinSummary } from '../types';
import { Card } from '../components/ui/Card';
import { GoogleDateRangePicker } from '../components/ui/GoogleDateRangePicker';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { subDays, format } from 'date-fns';
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
    ChevronDown
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
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${val.toLocaleString()}`;
};

const formatNumber = (val: number) => {
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return val.toLocaleString();
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
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Intelligence Loading...</h2>
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

    // Handle incoming date filters
    // Note: React Router `location.state` logic removed for Next.js migration.
    // If you need to pass forced dates between pages, use query params.

    useEffect(() => {
        if (selectedAccount) {
            if (selectedAccount.id !== 'Stahl') {
                setLoading(false);
                setData([]);
                return;
            }

            setLoading(true);
            getAsinSummaries(selectedAccount.id, { startDate, endDate })
                .then(res => {
                    setData(res);
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
                row.roas.toFixed(2),
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

    const HeaderCell = ({ label, sortKey, align = 'right', color, width }: { label: string, sortKey: SortKey, align?: 'left'|'right'|'center', color?: string, width?: string }) => (
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
    
    const avgRoas = totalSpend > 0 ? totalPaidSales / totalSpend : 0;
    const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const avgCvr = totalGV > 0 ? (totalOrders / totalGV) * 100 : 0;

    // Trends
    const mockTrendSales = data.length > 0 ? data[0].trends?.overallSales : 0;
    const mockTrendSpend = data.length > 0 ? data[0].trends?.spend : 0;
    const mockTrendRoas = data.length > 0 ? data[0].trends?.roas : 0;
    const mockTrendGV = data.length > 0 ? data[0].trends?.glanceViews : 0;
    const mockTrendCPC = data.length > 0 ? data[0].trends?.cpc : 0;
    const mockTrendCVR = data.length > 0 ? data[0].trends?.conversionRate : 0;

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
                <div className="w-full lg:w-auto">
                     <GoogleDateRangePicker startDate={startDate} endDate={endDate} onChange={handleDateChange} />
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
                    {/* KPI Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                         <KPICard title="Spends" value={formatCurrency(totalSpend)} trend={mockTrendSpend} isInverse={true} />
                         <KPICard title="Overall Sales" value={formatCurrency(overallSales)} trend={mockTrendSales} />
                         <KPICard title="RoAS" value={avgRoas.toFixed(2)} trend={mockTrendRoas} />
                         <KPICard title="Glance Views" value={formatNumber(totalGV)} trend={mockTrendGV} />
                         <KPICard title="CPC" value={`₹${avgCpc.toFixed(1)}`} trend={mockTrendCPC} isInverse={true} />
                         <KPICard title="CVR" value={`${avgCvr.toFixed(2)}%`} trend={mockTrendCVR} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Chart */}
                        <Card title="Sales Distribution" subtitle="Paid vs Organic" className="lg:col-span-2">
                            <div className="h-80 w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.slice(0, 15)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={4}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                        <XAxis dataKey="itemName" tick={false} axisLine={false} />
                                        <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `₹${val/1000}k`} axisLine={false} tickLine={false} />
                                        <Tooltip content={<SalesTooltip />} cursor={{fill: '#1e293b', opacity: 0.4}} />
                                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                        <Bar dataKey="paidSales" name="Paid Sales" stackId="a" fill="#6366f1" radius={[0,0,0,0]} barSize={20} />
                                        <Bar dataKey="organicSales" name="Organic Sales" stackId="a" fill="#475569" radius={[4,4,0,0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        {/* Top Performers */}
                        <Card title="Top 5 Movers" subtitle="By Revenue">
                            <div className="space-y-1 mt-2">
                                {[...data].sort((a,b) => b.overallSales - a.overallSales).slice(0, 5).map((asin, idx) => (
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
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {sortedData.map((row) => {
                                        const cvr = row.glanceViews > 0 ? (row.totalOrders / row.glanceViews) * 100 : 0;
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
                                                <td className="px-4 py-3.5 text-right">{row.impressions?.toLocaleString() || 0}</td>
                                                <td className="px-4 py-3.5 text-right">{row.clicks?.toLocaleString() || 0}</td>
                                                <td className="px-4 py-3.5 text-right">{row.roas?.toFixed(2) || 0}</td>
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
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
};

export default Dashboard;

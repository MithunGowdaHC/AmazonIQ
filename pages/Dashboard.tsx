import React, { useEffect, useState } from 'react';
import { useAuth } from '../services/authContext';
import { getAsinSummaries } from '../services/dataService';
import { AsinSummary } from '../types';
import { Card } from '../components/ui/Card';
import { GoogleDateRangePicker } from '../components/ui/GoogleDateRangePicker';
import { Link } from 'react-router-dom';
import { subDays, format } from 'date-fns';
import { 
    ArrowRight,
    TrendingUp,
    Construction,
    ArrowUpRight,
    ArrowDownRight
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

// New Smart KPI Card
const KPICard: React.FC<{
    title: string;
    value: string;
    trend?: number;
    isInverse?: boolean; // true for ACOS/Spend where down is good
    subValue?: string;
}> = ({ title, value, trend, isInverse = false, subValue }) => {
    const isPositive = trend !== undefined ? trend > 0 : false;
    const isGood = isInverse ? !isPositive : isPositive;
    
    return (
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors shadow-lg shadow-black/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-slate-800/20 to-transparent rounded-bl-full -mr-4 -mt-4 transition-opacity opacity-50 group-hover:opacity-100"></div>
            
            <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
                {trend !== undefined && (
                    <div className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${isGood ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(trend).toFixed(1)}%
                    </div>
                )}
            </div>
            <h3 className="text-2xl font-bold text-slate-100 tracking-tight">{value}</h3>
            {subValue && <p className="text-xs text-slate-500 mt-1">{subValue}</p>}
        </div>
    );
};

// In Progress Component
const InProgress: React.FC<{ accountName: string }> = ({ accountName }) => (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center">
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
        const total = paid + organic;

        return (
            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl min-w-[180px]">
                <p className="text-xs text-slate-400 font-medium mb-2 border-b border-slate-800 pb-1 truncate max-w-[160px]" title={label}>{label}</p>
                <div className="space-y-1.5">
                     <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-300">Total Sales</span>
                        <span className="text-sm font-bold text-white">₹{total.toLocaleString()}</span>
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

export const Dashboard: React.FC = () => {
    const { selectedAccount } = useAuth();
    const [data, setData] = useState<AsinSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    useEffect(() => {
        if (selectedAccount) {
            // STAHL ONLY LOGIC
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

    // STAHL CHECK
    if (selectedAccount && selectedAccount.id !== 'Stahl') {
        return <InProgress accountName={selectedAccount.name} />;
    }

    // Aggregate totals for KPIs
    const totalSales = data.reduce((sum, i) => sum + i.totalSales, 0);
    const totalSpend = data.reduce((sum, i) => sum + i.spend, 0);
    const totalGV = data.reduce((sum, i) => sum + i.glanceViews, 0);
    const totalPaidSales = data.reduce((sum, i) => sum + i.paidSales, 0);
    const totalClicks = data.reduce((sum, i) => sum + i.clicks, 0);
    const totalOrders = data.reduce((sum, i) => sum + i.totalOrders, 0);
    
    // Weighted Averages
    const avgRoas = totalSpend > 0 ? totalPaidSales / totalSpend : 0;
    const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const avgCvr = totalGV > 0 ? (totalOrders / totalGV) * 100 : 0;

    // Aggregated Trends (Weighted)
    const mockTrendSales = data.length > 0 ? data[0].trends?.totalSales : 0;
    const mockTrendSpend = data.length > 0 ? data[0].trends?.spend : 0;
    const mockTrendRoas = data.length > 0 ? data[0].trends?.roas : 0;
    const mockTrendGV = data.length > 0 ? data[0].trends?.glanceViews : 0;
    const mockTrendCPC = data.length > 0 ? data[0].trends?.cpc : 0;
    const mockTrendCVR = data.length > 0 ? data[0].trends?.conversionRate : 0;


    return (
        <div className="space-y-8">
            {/* Control Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-100 tracking-tight">Performance Overview</h2>
                    <p className="text-sm text-slate-400 mt-1">
                        Analyzing <span className="text-indigo-400 font-medium">{selectedAccount?.name}</span> data
                    </p>
                </div>
                <div className="w-full sm:w-auto">
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
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                         <KPICard 
                            title="Spends" 
                            value={formatCurrency(totalSpend)} 
                            trend={mockTrendSpend} 
                            isInverse={true}
                        />
                         <KPICard 
                            title="Sales" 
                            value={formatCurrency(totalSales)} 
                            trend={mockTrendSales} 
                        />
                         <KPICard 
                            title="RoAS" 
                            value={avgRoas.toFixed(2)} 
                            trend={mockTrendRoas} 
                        />
                         <KPICard 
                            title="Glance Views" 
                            value={formatNumber(totalGV)} 
                            trend={mockTrendGV} 
                        />
                         <KPICard 
                            title="CPC" 
                            value={`₹${avgCpc.toFixed(1)}`} 
                            trend={mockTrendCPC} 
                            isInverse={true}
                        />
                         <KPICard 
                            title="CVR" 
                            value={`${avgCvr.toFixed(2)}%`} 
                            trend={mockTrendCVR} 
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Chart */}
                        <Card title="Sales Distribution" subtitle="Paid vs Organic" className="lg:col-span-2">
                            <div className="h-80 w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart 
                                        data={data.slice(0, 15)} 
                                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }} 
                                        barGap={4}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                        <XAxis 
                                            dataKey="itemName" 
                                            tick={false} 
                                            axisLine={false} 
                                        />
                                        <YAxis 
                                            stroke="#64748b" 
                                            fontSize={11} 
                                            tickFormatter={(val) => `₹${val/1000}k`} 
                                            axisLine={false} 
                                            tickLine={false} 
                                        />
                                        <Tooltip content={<SalesTooltip />} cursor={{fill: '#1e293b', opacity: 0.4}} />
                                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                        <Bar 
                                            dataKey="paidSales" 
                                            name="Paid Sales" 
                                            stackId="a" 
                                            fill="#6366f1" 
                                            radius={[0,0,0,0]} 
                                            barSize={20}
                                        />
                                        <Bar 
                                            dataKey="organicSales" 
                                            name="Organic Sales" 
                                            stackId="a" 
                                            fill="#475569" 
                                            radius={[4,4,0,0]} 
                                            barSize={20}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        {/* Top Performers List */}
                        <Card title="Top 5 Movers" subtitle="By Revenue">
                            <div className="space-y-1 mt-2">
                                {[...data].sort((a,b) => b.totalSales - a.totalSales).slice(0, 5).map((asin, idx) => (
                                    <Link to={`/asin/${asin.asin}`} key={asin.asin} className="flex items-center gap-3 py-3 px-3 hover:bg-slate-800/50 rounded-lg group cursor-pointer transition-all border border-transparent hover:border-slate-700/50">
                                        <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] ${idx === 0 ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30' : 'bg-slate-800 text-slate-500'}`}>
                                            #{idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-200 truncate group-hover:text-indigo-400 transition-colors">{asin.itemName || asin.asin}</p>
                                            <p className="text-[10px] text-slate-500 font-mono">ASIN: {asin.asin}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-slate-200">{formatCurrency(asin.totalSales)}</p>
                                            {/* Mock small sparkline or arrow */}
                                            {asin.trends && (
                                                <div className={`text-[10px] flex items-center justify-end gap-0.5 ${asin.trends.totalSales > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {asin.trends.totalSales > 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                                                    {Math.abs(asin.trends.totalSales).toFixed(0)}%
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Detailed List */}
                    <Card title="Detailed Performance" subtitle="ASIN Level Breakdown">
                        <div className="overflow-x-auto -mx-6">
                            <table className="w-full text-left text-sm text-slate-400">
                                <thead className="bg-slate-950/50 text-[10px] uppercase font-bold text-slate-500 border-y border-slate-800">
                                    <tr>
                                        <th className="px-6 py-4 w-64 tracking-wider">Product Details</th>
                                        <th className="px-4 py-4 text-right tracking-wider">Spends</th>
                                        <th className="px-4 py-4 text-right text-indigo-400 tracking-wider">Sales</th>
                                        <th className="px-4 py-4 text-right tracking-wider">Orders</th>
                                        <th className="px-4 py-4 text-right tracking-wider">Impr.</th>
                                        <th className="px-4 py-4 text-right tracking-wider">Clicks</th>
                                        <th className="px-4 py-4 text-right text-emerald-500 tracking-wider">Org Sales</th>
                                        <th className="px-4 py-4 text-right tracking-wider">RoAS</th>
                                        <th className="px-4 py-4 text-right tracking-wider">CPC</th>
                                        <th className="px-4 py-4 text-right tracking-wider">CTR</th>
                                        <th className="px-4 py-4 text-right tracking-wider">ACOS</th>
                                        <th className="px-4 py-4 text-right tracking-wider">Idx GV</th>
                                        <th className="px-4 py-4 text-right tracking-wider">Paid GV</th>
                                        <th className="px-4 py-4 text-right tracking-wider">Org GV</th>
                                        <th className="px-4 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {data.map((row) => (
                                        <tr key={row.asin} className="hover:bg-slate-800/30 transition-colors group text-xs">
                                            <td className="px-6 py-3.5">
                                                <Link to={`/asin/${row.asin}`} className="flex flex-col group-hover:text-indigo-400 transition-colors">
                                                    <span className="font-semibold text-slate-300 truncate max-w-[200px]" title={row.itemName}>{row.itemName || row.asin}</span>
                                                    <span className="text-[10px] text-slate-500 font-mono mt-0.5">{row.asin}</span>
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-medium text-slate-300">₹{Math.round(row.spend).toLocaleString()}</td>
                                            <td className="px-4 py-3.5 text-right font-bold text-indigo-400">₹{Math.round(row.totalSales).toLocaleString()}</td>
                                            <td className="px-4 py-3.5 text-right">{row.totalOrders}</td>
                                            <td className="px-4 py-3.5 text-right">{row.impressions?.toLocaleString() || 0}</td>
                                            <td className="px-4 py-3.5 text-right">{row.clicks?.toLocaleString() || 0}</td>
                                            <td className="px-4 py-3.5 text-right text-emerald-500">₹{Math.round(row.organicSales).toLocaleString()}</td>
                                            <td className="px-4 py-3.5 text-right">{row.roas?.toFixed(2) || 0}</td>
                                            <td className="px-4 py-3.5 text-right">₹{row.cpc?.toFixed(0) || 0}</td>
                                            <td className="px-4 py-3.5 text-right">{row.ctr?.toFixed(2) || 0}%</td>
                                            <td className="px-4 py-3.5 text-right">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${row.acos < 25 ? 'bg-emerald-500/10 text-emerald-400' : row.acos > 40 ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>
                                                    {row.acos?.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-medium text-slate-300">{row.glanceViews?.toLocaleString() || 0}</td>
                                            <td className="px-4 py-3.5 text-right text-slate-500">{row.paidGlanceViews?.toLocaleString() || 0}</td>
                                            <td className="px-4 py-3.5 text-right text-slate-500">{row.organicGlanceViews?.toLocaleString() || 0}</td>
                                            <td className="px-4 py-3.5 text-right">
                                                <Link 
                                                    to={`/asin/${row.asin}`} 
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600 hover:text-white text-indigo-400 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all"
                                                >
                                                    Analyze
                                                    <ArrowRight className="w-3 h-3" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
};
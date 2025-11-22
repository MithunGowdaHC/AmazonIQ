
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../services/authContext';
import { getAsinDetails, getDailyPerformance } from '../services/dataService';
import { AsinSummary, DailyPerformance } from '../types';
import { Card } from '../components/ui/Card';
import { GoogleDateRangePicker } from '../components/ui/GoogleDateRangePicker';
import { ArrowLeft, Calendar, Search, ChevronRight, BarChart2, ChevronDown } from 'lucide-react';
import { subDays, format } from 'date-fns';
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    Legend, 
    ComposedChart, 
    Line 
} from 'recharts';

// Reusing the MetricPill component
const MetricPill = ({ label, value, colorClass = "text-slate-100" }: { label: string, value: string, colorClass?: string }) => (
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-md min-w-[140px]">
        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{label}</p>
        <p className={`text-lg font-bold mt-1 ${colorClass}`}>{value}</p>
    </div>
);

export const AsinAnalytics: React.FC = () => {
    const router = useRouter();
    const asin = Array.isArray(router.query.asin) ? router.query.asin[0] : (router.query.asin as string | undefined);
    const { selectedAccount } = useAuth();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [summary, setSummary] = useState<AsinSummary | null>(null);
    const [dailyData, setDailyData] = useState<DailyPerformance[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Chart Toggle State
    const [trafficView, setTrafficView] = useState<'sales' | 'gv'>('sales');

    // Date State
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            router.push(`/analytics/${searchTerm.trim()}`);
        }
    };

    useEffect(() => {
        if (selectedAccount && asin) {
            setLoading(true);
            const range = { startDate, endDate };
            
            Promise.all([
                getAsinDetails(asin, selectedAccount.id, range),
                getDailyPerformance(asin, range)
            ]).then(([sumRes, dailyRes]) => {
                if (sumRes) setSummary(sumRes);
                else setSummary(null);
                setDailyData(dailyRes);
                setLoading(false);
            }).catch(e => {
                console.error(e);
                setLoading(false);
            });
        } else {
            // Reset if no ASIN in URL
            setSummary(null);
            setDailyData([]);
        }
    }, [selectedAccount, asin, startDate, endDate]);

    const handleBack = () => {
        router.push('/analytics');
    };

    // --- STATE: EMPTY SEARCH ---
    if (!asin) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] px-4">
                <div className="w-full max-w-lg text-center">
                    <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                        <div className="absolute inset-0 rounded-full border border-indigo-500/30 animate-ping opacity-20"></div>
                        <BarChart2 className="w-10 h-10 text-indigo-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-100 mb-3">ASIN Deep Dive</h1>
                    <p className="text-slate-400 mb-8">Enter an ASIN to retrieve comprehensive performance metrics.</p>
                    
                    <form onSubmit={handleSearch} className="relative">
                        <input 
                            type="text" 
                            placeholder="Enter ASIN (e.g., B08XYZ1234)" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-lg rounded-xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-xl"
                            autoFocus
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-500" />
                        <button 
                            type="submit"
                            disabled={!searchTerm.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-0 disabled:pointer-events-none"
                        >
                            Analyze
                        </button>
                    </form>
                    
                    <div className="mt-8 flex gap-3 justify-center flex-wrap">
                        {['B08XYZ1234', 'B0SAM11111'].map(ex => (
                            <button 
                                key={ex}
                                onClick={() => router.push(`/analytics/${ex}`)}
                                className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-400 hover:border-indigo-500/50 hover:text-indigo-400 transition-all"
                            >
                                Try {ex}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // --- STATE: LOADING ---
    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[80vh] space-y-3 text-slate-500">
            <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
            <p className="text-sm">Analyzing Intelligence for {asin}...</p>
        </div>
    );
    
    // --- STATE: NOT FOUND ---
    if (!summary) return (
        <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
            <h2 className="text-xl font-bold text-slate-200">ASIN Not Found</h2>
            <p className="text-slate-500 mt-2 mb-6">We couldn't find data for {asin} in the selected account.</p>
            <button onClick={handleBack} className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors">
                Try Another ASIN
            </button>
        </div>
    );

    // Funnel Data
    const funnelData = [
        { name: 'Glance Views', value: summary.glanceViews, fill: '#6366f1' },
        { name: 'Paid GV', value: summary.paidGlanceViews, fill: '#334155' },
        { name: 'Organic GV', value: summary.organicGlanceViews, fill: '#334155' },
        { name: 'Clicks', value: summary.clicks, fill: '#8b5cf6' },
        { name: 'Orders', value: summary.totalOrders, fill: '#10b981' },
    ];

    const paidShare = summary.glanceViews > 0 ? (summary.paidGlanceViews / summary.glanceViews) * 100 : 0;
    const orgShare = summary.glanceViews > 0 ? (summary.organicGlanceViews / summary.glanceViews) * 100 : 0;

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Header & Controls */}
            <div className="flex flex-col gap-4 bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-[-8px] overflow-x-auto scrollbar-hide whitespace-nowrap">
                    <Link href="/analytics" className="hover:text-indigo-400 flex items-center gap-1">
                        <BarChart2 className="w-3 h-3" /> Analytics
                    </Link>
                    <ChevronRight className="w-3 h-3" />
                    <span className="font-medium text-slate-400">{asin}</span>
                </div>

                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleBack} 
                            className="p-2 hover:bg-slate-800 rounded-full transition-colors border border-transparent hover:border-slate-700 text-slate-400"
                            title="New Search"
                        >
                            <Search className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-xl font-bold text-slate-100 tracking-tight">{summary.asin}</h2>
                                {summary.brand && <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 text-[10px] rounded border border-indigo-500/20 font-bold uppercase tracking-wider">{summary.brand}</span>}
                            </div>
                            <p className="text-sm text-slate-400 truncate max-w-[200px] sm:max-w-md font-medium">{summary.itemName || 'Product Title Unavailable'}</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full xl:w-auto">
                        <GoogleDateRangePicker startDate={startDate} endDate={endDate} onChange={(s, e) => { setStartDate(s); setEndDate(e); }} />
                        <Link 
                            href={`/analytics/${asin}/pivot`}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-indigo-900/30 h-[42px] whitespace-nowrap w-full sm:w-auto"
                        >
                            <Calendar className="w-4 h-4" />
                            Pivot View
                        </Link>
                    </div>
                </div>
            </div>

            {/* Single Row Data Table */}
            <Card title="Performance Snapshot" className="overflow-hidden">
                 <div className="overflow-x-auto -mx-6 my-[-12px] scrollbar-hide">
                     <table className="w-full text-right text-sm">
                        <thead className="bg-slate-950/50 text-[10px] text-slate-500 uppercase font-bold border-b border-slate-800">
                            <tr>
                                <th className="px-4 py-3 text-left pl-6 min-w-[120px]">Product</th>
                                <th className="px-4 py-3 min-w-[80px]">Spends</th>
                                <th className="px-4 py-3 text-indigo-400 min-w-[100px]">Overall Sales</th>
                                <th className="px-4 py-3 min-w-[60px]">Orders</th>
                                <th className="px-4 py-3 min-w-[80px]">Impr.</th>
                                <th className="px-4 py-3 min-w-[80px]">Clicks</th>
                                <th className="px-4 py-3 min-w-[60px]">CPC</th>
                                <th className="px-4 py-3 text-emerald-500 min-w-[60px]">CVR</th>
                                <th className="px-4 py-3 min-w-[80px]">Idx GV</th>
                                <th className="px-4 py-3 min-w-[80px]">Paid GV</th>
                                <th className="px-4 py-3 min-w-[80px]">Org GV</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs font-medium text-slate-300">
                            <tr>
                                <td className="px-4 py-4 text-left pl-6 text-slate-100 font-bold">{summary.asin}</td>
                                <td className="px-4 py-4">₹{summary.spend.toLocaleString()}</td>
                                <td className="px-4 py-4 text-indigo-400 font-bold">₹{summary.overallSales.toLocaleString()}</td>
                                <td className="px-4 py-4">{summary.totalOrders}</td>
                                <td className="px-4 py-4">{summary.impressions.toLocaleString()}</td>
                                <td className="px-4 py-4">{summary.clicks.toLocaleString()}</td>
                                <td className="px-4 py-4">₹{summary.cpc.toFixed(1)}</td>
                                <td className="px-4 py-4 text-emerald-500">{((summary.totalOrders / summary.glanceViews) * 100 || 0).toFixed(2)}%</td>
                                <td className="px-4 py-4">{summary.glanceViews.toLocaleString()}</td>
                                <td className="px-4 py-4 text-slate-500">
                                    <div>{summary.paidGlanceViews.toLocaleString()}</div>
                                    <div className="text-[10px] text-slate-600 font-mono">({paidShare.toFixed(0)}%)</div>
                                </td>
                                <td className="px-4 py-4 text-slate-500">
                                    <div>{summary.organicGlanceViews.toLocaleString()}</div>
                                    <div className="text-[10px] text-slate-600 font-mono">({orgShare.toFixed(0)}%)</div>
                                </td>
                            </tr>
                        </tbody>
                     </table>
                 </div>
            </Card>

            {/* Highlight Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <MetricPill label="Overall Sales" value={`₹${summary.overallSales.toLocaleString()}`} />
                <MetricPill label="Paid Sales" value={`₹${summary.paidSales.toLocaleString()}`} colorClass="text-indigo-400" />
                <MetricPill label="Spend" value={`₹${summary.spend.toLocaleString()}`} />
                <MetricPill label="ACOS" value={`${summary.acos.toFixed(1)}%`} colorClass={summary.acos > 40 ? 'text-rose-400' : 'text-emerald-400'} />
                <MetricPill label="ROAS" value={summary.roas.toFixed(2)} />
                <MetricPill label="CTR" value={`${summary.ctr.toFixed(2)}%`} />
            </div>

            {/* Main Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title="Sales & Spend Trend" className="lg:col-span-2">
                    <div className="h-80 w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={dailyData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid stroke="#1e293b" vertical={false} strokeDasharray="3 3" />
                                <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v/1000}k`} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v/1000}k`} tickLine={false} axisLine={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', borderRadius: '8px' }}
                                    itemStyle={{ color: '#cbd5e1' }}
                                />
                                <Legend />
                                <Area yAxisId="left" type="monotone" dataKey="overallSales" name="Overall Sales" fill="url(#colorSales)" stroke="#6366f1" strokeWidth={2} />
                                <Line yAxisId="right" type="monotone" dataKey="spend" name="Spend" stroke="#f43f5e" strokeWidth={2} dot={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card title="Conversion Funnel">
                    <div className="h-80 flex flex-col justify-center space-y-6 px-2">
                        {funnelData.map((item, idx) => {
                            const widthPercent = idx === 0 ? 100 : (funnelData[0].value > 0 ? (item.value / funnelData[0].value) * 100 : 0);
                            const visualWidth = Math.max(widthPercent, 10);
                            
                            return (
                                <div key={item.name} className="relative group">
                                    <div className="flex justify-between text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                                        <span>{item.name}</span>
                                        <span className="text-slate-200">{item.value.toLocaleString()}</span>
                                    </div>
                                    <div className="h-4 bg-slate-800 rounded-full overflow-hidden relative">
                                        <div 
                                            className="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                                            style={{ width: `${visualWidth}%`, backgroundColor: item.fill }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card 
                    title="Traffic Breakdown" 
                    action={
                        <div className="relative">
                            <select 
                                value={trafficView}
                                onChange={(e) => setTrafficView(e.target.value as 'sales' | 'gv')}
                                className="appearance-none bg-slate-800 text-xs font-medium text-slate-200 pl-3 pr-8 py-1.5 rounded-lg border border-slate-700 hover:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer"
                            >
                                <option value="sales">Sales Split (Paid vs Org)</option>
                                <option value="gv">GV Split (Paid vs Org)</option>
                            </select>
                            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    }
                >
                    <div className="h-64 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                             <AreaChart data={dailyData} margin={{top: 10, right: 10, left: 0, bottom: 0}}>
                                <defs>
                                    <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorOrg" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="date" tickFormatter={(d) => d.slice(8)} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', borderRadius: '8px' }} />
                                <Legend />
                                <Area 
                                    type="monotone" 
                                    dataKey={trafficView === 'sales' ? 'organicSales' : 'organicGlanceViews'} 
                                    stackId="1" 
                                    stroke="#10b981" 
                                    fill="url(#colorOrg)" 
                                    name={trafficView === 'sales' ? 'Organic Sales' : 'Organic GV'} 
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey={trafficView === 'sales' ? 'paidSales' : 'paidGlanceViews'} 
                                    stackId="1" 
                                    stroke="#6366f1" 
                                    fill="url(#colorPaid)" 
                                    name={trafficView === 'sales' ? 'Paid Sales' : 'Paid GV'} 
                                />
                             </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                 <Card title="Conversion Rate Trend">
                    <div className="h-64 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                             <ComposedChart data={dailyData} margin={{top: 10, right: 10, left: 0, bottom: 0}}>
                                <CartesianGrid stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="date" tickFormatter={(d) => d.slice(8)} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', borderRadius: '8px' }} />
                                <Line type="monotone" dataKey="conversionRate" stroke="#f59e0b" strokeWidth={3} dot={false} name="CVR %" />
                             </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default AsinAnalytics;

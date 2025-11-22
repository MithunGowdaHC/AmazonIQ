
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../services/authContext';
import { getAsinDetails, getDailyPerformance } from '../services/dataService';
import { AsinSummary, DailyPerformance } from '../types';
import { Card } from '../components/ui/Card';
import { GoogleDateRangePicker } from '../components/ui/GoogleDateRangePicker';
import { ArrowLeft, Calendar, Home, ChevronRight } from 'lucide-react';
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

export const AsinDetail: React.FC = () => {
    const { selectedAccount } = useAuth();
    const router = useRouter();
    const asin = Array.isArray(router.query.asin) ? router.query.asin[0] : (router.query.asin as string | undefined);
    
    const [summary, setSummary] = useState<AsinSummary | null>(null);
    const [dailyData, setDailyData] = useState<DailyPerformance[]>([]);
    const [loading, setLoading] = useState(true);

    // Date State
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    useEffect(() => {
        if (selectedAccount && asin) {
            setLoading(true);
            const range = { startDate, endDate };
            
            Promise.all([
                getAsinDetails(asin, selectedAccount.id, range),
                getDailyPerformance(asin, range)
            ]).then(([sumRes, dailyRes]) => {
                if (sumRes) setSummary(sumRes);
                setDailyData(dailyRes);
                setLoading(false);
            }).catch(e => {
                console.error(e);
                setLoading(false);
            });
        }
    }, [selectedAccount, asin, startDate, endDate]);

    const handleBack = () => {
        if (typeof window !== 'undefined' && window.history.length > 2) {
            router.back();
        } else {
            router.push('/');
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-full space-y-3 text-slate-500">
            <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
            <p className="text-sm">Loading Intelligence for {asin}...</p>
        </div>
    );
    
    if (!summary) return (
        <div className="p-8 text-center">
            <p className="text-slate-500">No data found for this ASIN in the selected date range.</p>
            <button onClick={handleBack} className="mt-4 text-indigo-400 hover:underline text-sm">Return to Dashboard</button>
        </div>
    );

    // Funnel Data
    const funnelData = [
        { name: 'Impressions', value: summary.impressions, fill: '#334155' },
        { name: 'Glance Views', value: summary.glanceViews, fill: '#6366f1' },
        { name: 'Clicks', value: summary.clicks, fill: '#8b5cf6' },
        { name: 'Orders', value: summary.totalOrders, fill: '#10b981' },
    ];

    const MetricPill = ({ label, value, colorClass = "text-slate-100" }: { label: string, value: string, colorClass?: string }) => (
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-md">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{label}</p>
            <p className={`text-lg font-bold mt-1 ${colorClass}`}>{value}</p>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-[-8px]">
                    <Link href="/" className="hover:text-indigo-400 flex items-center gap-1">
                        <Home className="w-3 h-3" /> Dashboard
                    </Link>
                    <ChevronRight className="w-3 h-3" />
                    <span className="font-medium text-slate-400">Details</span>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleBack} 
                            className="p-2 hover:bg-slate-800 rounded-full transition-colors border border-transparent hover:border-slate-700 text-slate-400"
                            title="Go Back"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-slate-100 tracking-tight">{summary.asin}</h2>
                                {summary.brand && <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 text-[10px] rounded border border-indigo-500/20 font-bold uppercase tracking-wider">{summary.brand}</span>}
                            </div>
                            <p className="text-sm text-slate-400 truncate max-w-md font-medium">{summary.itemName || 'Product Title Unavailable'}</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full md:w-auto">
                        <GoogleDateRangePicker startDate={startDate} endDate={endDate} onChange={(s, e) => { setStartDate(s); setEndDate(e); }} />
                        <Link 
                            href={`/asin/${asin}/datewise`}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-indigo-900/30 h-[42px] whitespace-nowrap"
                        >
                            <Calendar className="w-4 h-4" />
                            Pivot View
                        </Link>
                    </div>
                </div>
            </div>

            {/* Highlight Metrics Strip */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <MetricPill label="Overall Sales" value={`₹${summary.overallSales.toLocaleString()}`} />
                <MetricPill label="Paid Sales" value={`₹${summary.paidSales.toLocaleString()}`} colorClass="text-indigo-400" />
                <MetricPill label="Spend" value={`₹${summary.spend.toLocaleString()}`} />
                <MetricPill label="ACOS" value={`${summary.acos.toFixed(1)}%`} colorClass={summary.acos > 40 ? 'text-rose-400' : 'text-emerald-400'} />
                <MetricPill label="ROAS" value={summary.roas.toFixed(2)} />
                <MetricPill label="Conv. Rate" value={`${(summary.glanceViews > 0 ? (summary.totalOrders / summary.glanceViews)*100 : 0).toFixed(2)}%`} colorClass="text-emerald-400" />
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
                <Card title="Traffic Source: Paid vs Organic">
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
                                <Area type="monotone" dataKey="organicSales" stackId="1" stroke="#10b981" fill="url(#colorOrg)" name="Organic Sales" />
                                <Area type="monotone" dataKey="paidSales" stackId="1" stroke="#6366f1" fill="url(#colorPaid)" name="Paid Sales" />
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

export default AsinDetail;

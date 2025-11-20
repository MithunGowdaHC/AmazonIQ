import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getDailyPerformance } from '../services/dataService';
import { DailyPerformance } from '../types';
import { Card } from '../components/ui/Card';
import { GoogleDateRangePicker } from '../components/ui/GoogleDateRangePicker';
import { Download, ArrowLeft, Home, ChevronRight } from 'lucide-react';
import { subDays, format, parseISO } from 'date-fns';

export const AsinDatewise: React.FC = () => {
    const { asin } = useParams<{ asin: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<DailyPerformance[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    useEffect(() => {
        if (asin) {
            setLoading(true);
            getDailyPerformance(asin, { startDate, endDate }).then(res => {
                // Sort by date desc for table
                setData(res.sort((a,b) => b.date.localeCompare(a.date)));
                setLoading(false);
            });
        }
    }, [asin, startDate, endDate]);

    const handleBack = () => {
        if (window.history.length > 2) {
            navigate(-1);
        } else {
            navigate(`/asin/${asin}`);
        }
    };

    const exportCSV = () => {
        const headers = ["Date", "Total Sales", "Paid Sales", "Org Sales", "Spend", "Orders", "Clicks", "Impressions", "GV"];
        const rows = data.map(d => [
            d.date,
            d.totalSales,
            d.paidSales,
            d.organicSales,
            d.spend,
            d.totalOrders,
            d.clicks,
            d.impressions,
            d.glanceViews
        ]);
        
        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n" 
            + rows.map(e => e.join(",")).join("\n");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${asin}_${startDate}_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col gap-4 shrink-0 bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm">
                 {/* Breadcrumb */}
                 <div className="flex items-center gap-2 text-xs text-slate-500 mb-[-8px]">
                    <Link to="/" className="hover:text-indigo-400 flex items-center gap-1">
                        <Home className="w-3 h-3" /> Dashboard
                    </Link>
                    <ChevronRight className="w-3 h-3" />
                    <Link to={`/asin/${asin}`} className="hover:text-indigo-400">Details</Link>
                    <ChevronRight className="w-3 h-3" />
                    <span className="font-medium text-slate-400">Pivot</span>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleBack} 
                            className="p-2 hover:bg-slate-800 rounded-full transition-colors border border-transparent hover:border-slate-700 text-slate-400"
                            title="Go Back"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-100 tracking-tight">Daily Pivot</h1>
                            <p className="text-sm text-slate-500 font-mono">{asin}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <GoogleDateRangePicker startDate={startDate} endDate={endDate} onChange={(s,e) => {setStartDate(s); setEndDate(e);}} />
                        <button 
                            onClick={exportCSV}
                            disabled={data.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 h-[42px] shadow-lg shadow-emerald-900/20 whitespace-nowrap"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                    </div>
                </div>
            </div>

            <Card className="flex-1 overflow-hidden flex flex-col p-0 border-0 shadow-none bg-transparent">
                {loading ? (
                    <div className="flex items-center justify-center h-64 text-slate-500">
                         <div className="w-6 h-6 border-2 border-slate-600 border-t-indigo-500 rounded-full animate-spin mr-2"></div>
                         Loading pivot data...
                    </div>
                ) : (
                    <div className="overflow-auto flex-1 scrollbar-hide rounded-xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/20">
                        <table className="w-full text-sm text-right border-collapse">
                            <thead className="bg-slate-950 text-slate-500 text-xs font-bold sticky top-0 z-10 uppercase tracking-wider shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 text-left border-b border-slate-800 bg-slate-950 sticky left-0 z-20 w-32 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.5)]">Date</th>
                                    <th className="px-4 py-3 border-b border-slate-800 text-indigo-400">Total Sales</th>
                                    <th className="px-4 py-3 border-b border-slate-800">Paid Sales</th>
                                    <th className="px-4 py-3 border-b border-slate-800">Org Sales</th>
                                    <th className="px-4 py-3 border-b border-slate-800">Spend</th>
                                    <th className="px-4 py-3 border-b border-slate-800">ACOS</th>
                                    <th className="px-4 py-3 border-b border-slate-800">Orders</th>
                                    <th className="px-4 py-3 border-b border-slate-800">Clicks</th>
                                    <th className="px-4 py-3 border-b border-slate-800">CPC</th>
                                    <th className="px-4 py-3 border-b border-slate-800">GV</th>
                                    <th className="px-4 py-3 border-b border-slate-800 text-emerald-500">CVR</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50 font-mono text-xs">
                                {data.map((row, idx) => {
                                    const acos = row.paidSales > 0 ? (row.spend / row.paidSales) * 100 : 0;
                                    const cpc = row.clicks > 0 ? row.spend / row.clicks : 0;
                                    return (
                                        <tr key={row.date} className="hover:bg-slate-800/50 transition-colors group">
                                            <td className="px-4 py-3 text-left text-slate-400 font-sans sticky left-0 bg-slate-900 border-r border-slate-800 group-hover:bg-slate-800 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.5)]">
                                                {format(parseISO(row.date), 'MMM d')}
                                            </td>
                                            <td className="px-4 py-3 font-bold text-indigo-400 border-r border-slate-800">₹{Math.round(row.totalSales).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-slate-400 border-r border-slate-800">₹{Math.round(row.paidSales).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-emerald-600 border-r border-slate-800">₹{Math.round(row.organicSales).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-slate-400 border-r border-slate-800">₹{Math.round(row.spend).toLocaleString()}</td>
                                            <td className="px-4 py-3 border-r border-slate-800">
                                                <span className={acos > 40 ? 'text-rose-500 font-bold' : 'text-slate-500'}>
                                                    {acos.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 border-r border-slate-800">{row.totalOrders}</td>
                                            <td className="px-4 py-3 text-slate-500 border-r border-slate-800">{row.clicks}</td>
                                            <td className="px-4 py-3 text-slate-400 border-r border-slate-800">₹{cpc.toFixed(1)}</td>
                                            <td className="px-4 py-3 text-slate-500 border-r border-slate-800">{row.glanceViews.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-emerald-500 font-medium">
                                                {row.conversionRate.toFixed(2)}%
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};
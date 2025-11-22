
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
            navigate(`/analytics/${asin}`);
        }
    };

    const exportCSV = () => {
        // Order: Date, Spends, Paid Sales, Orders, Impr, Clicks, RoAS, CVR, Overall Sales, Idx GV, Paid GV, Org GV
        const headers = [
            "Date", "Spend", "Paid Sales", "Orders", "Impressions", 
            "Clicks", "ROAS", "CVR", "Overall Sales", "Idx GV", 
            "Paid GV", "Org GV"
        ];
        
        const rows = data.map(d => {
            const roas = d.spend > 0 ? d.paidSales / d.spend : 0;
            const cvr = d.glanceViews > 0 ? (d.totalOrders / d.glanceViews) * 100 : 0;
            
            return [
                d.date,
                d.spend,
                d.paidSales,
                d.totalOrders,
                d.impressions,
                d.clicks,
                roas.toFixed(2),
                cvr.toFixed(2) + "%",
                d.overallSales,
                d.glanceViews,
                d.paidGlanceViews || Math.round(d.glanceViews * 0.4), // Fallback if undefined in mock
                d.organicGlanceViews || Math.round(d.glanceViews * 0.6)
            ];
        });
        
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
                    <Link to="/analytics" className="hover:text-indigo-400">Analytics</Link>
                    <ChevronRight className="w-3 h-3" />
                    <Link to={`/analytics/${asin}`} className="hover:text-indigo-400">{asin}</Link>
                    <ChevronRight className="w-3 h-3" />
                    <span className="font-medium text-slate-400">Pivot</span>
                </div>

                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
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
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
                        <GoogleDateRangePicker startDate={startDate} endDate={endDate} onChange={(s,e) => {setStartDate(s); setEndDate(e);}} />
                        <button 
                            onClick={exportCSV}
                            disabled={data.length === 0}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 h-[42px] shadow-lg shadow-emerald-900/20 whitespace-nowrap"
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
                        <table className="w-full text-sm text-right border-collapse whitespace-nowrap">
                            <thead className="bg-slate-950 text-slate-500 text-xs font-bold sticky top-0 z-10 uppercase tracking-wider shadow-sm">
                                <tr>
                                    {/* Order: Date, Spend, Paid Sales, Orders, Impr, Clicks, ROAS, CVR, Overall Sales, Idx GV, Paid GV, Org GV */}
                                    <th className="px-4 py-3 text-left border-b border-slate-800 bg-slate-950 sticky left-0 z-20 w-32 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.5)]">Date</th>
                                    <th className="px-4 py-3 border-b border-slate-800">Spends</th>
                                    <th className="px-4 py-3 border-b border-slate-800">Paid Sales</th>
                                    <th className="px-4 py-3 border-b border-slate-800">Orders</th>
                                    <th className="px-4 py-3 border-b border-slate-800">Impr.</th>
                                    <th className="px-4 py-3 border-b border-slate-800">Clicks</th>
                                    <th className="px-4 py-3 border-b border-slate-800">ROAS</th>
                                    <th className="px-4 py-3 border-b border-slate-800 text-emerald-500">CVR</th>
                                    <th className="px-4 py-3 border-b border-slate-800 text-indigo-400">Overall Sales</th>
                                    <th className="px-4 py-3 border-b border-slate-800">Idx GV</th>
                                    <th className="px-4 py-3 border-b border-slate-800">Paid GV</th>
                                    <th className="px-4 py-3 border-b border-slate-800">Org GV</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50 font-mono text-xs">
                                {data.map((row, idx) => {
                                    const acos = row.paidSales > 0 ? (row.spend / row.paidSales) * 100 : 0;
                                    const roas = row.spend > 0 ? row.paidSales / row.spend : 0;
                                    const cpc = row.clicks > 0 ? row.spend / row.clicks : 0;
                                    const cvr = row.glanceViews > 0 ? (row.totalOrders / row.glanceViews) * 100 : 0;
                                    const paidGV = row.paidGlanceViews || Math.round(row.glanceViews * 0.4);
                                    const orgGV = row.organicGlanceViews || Math.round(row.glanceViews * 0.6);
                                    
                                    const paidShare = row.glanceViews > 0 ? (paidGV / row.glanceViews) * 100 : 0;
                                    const orgShare = row.glanceViews > 0 ? (orgGV / row.glanceViews) * 100 : 0;

                                    return (
                                        <tr key={row.date} className="hover:bg-slate-800/50 transition-colors group">
                                            <td className="px-4 py-3 text-left text-slate-400 font-sans sticky left-0 bg-slate-900 border-r border-slate-800 group-hover:bg-slate-800 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.5)]">
                                                {format(parseISO(row.date), 'MMM d')}
                                            </td>
                                            <td className="px-4 py-3 text-slate-400 border-r border-slate-800">₹{Math.round(row.spend).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-slate-400 border-r border-slate-800">₹{Math.round(row.paidSales).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-slate-500 border-r border-slate-800">{row.totalOrders}</td>
                                            <td className="px-4 py-3 text-slate-500 border-r border-slate-800">{row.impressions.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-slate-500 border-r border-slate-800">{row.clicks.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-slate-300 border-r border-slate-800">{roas.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-emerald-500 font-medium border-r border-slate-800">{cvr.toFixed(2)}%</td>
                                            <td className="px-4 py-3 font-bold text-indigo-400 border-r border-slate-800">₹{Math.round(row.overallSales).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-slate-500 border-r border-slate-800">{row.glanceViews.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-slate-500 border-r border-slate-800">
                                                <div>{paidGV.toLocaleString()}</div>
                                                <div className="text-[10px] text-slate-600 font-mono">({paidShare.toFixed(0)}%)</div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 border-r border-slate-800">
                                                <div>{orgGV.toLocaleString()}</div>
                                                <div className="text-[10px] text-slate-600 font-mono">({orgShare.toFixed(0)}%)</div>
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

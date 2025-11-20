import React, { useEffect, useState } from 'react';
import { useAuth } from '../services/authContext';
import { getAccountDailyPerformance } from '../services/dataService';
import { DailyPerformance } from '../types';
import { Card } from '../components/ui/Card';
import { GoogleDateRangePicker } from '../components/ui/GoogleDateRangePicker';
import { Download, CalendarClock } from 'lucide-react';
import { subDays, format, parseISO } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const AccountHistory: React.FC = () => {
    const { selectedAccount } = useAuth();
    const [data, setData] = useState<DailyPerformance[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    useEffect(() => {
        if (selectedAccount) {
            setLoading(true);
            getAccountDailyPerformance(selectedAccount.id, { startDate, endDate })
                .then(res => {
                    setData(res.sort((a,b) => b.date.localeCompare(a.date)));
                    setLoading(false);
                });
        }
    }, [selectedAccount, startDate, endDate]);

    const exportCSV = () => {
        const headers = ["Date", "Total Sales", "Spend", "Orders", "Clicks", "Impressions", "GV"];
        const rows = data.map(d => [
            d.date, d.totalSales, d.spend, d.totalOrders, d.clicks, d.impressions, d.glanceViews
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${selectedAccount?.name}_History.csv`);
        document.body.appendChild(link);
        link.click();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Account History</h1>
                    <p className="text-sm text-slate-400">Daily aggregate performance for {selectedAccount?.name}</p>
                </div>
                <div className="flex items-center gap-3">
                    <GoogleDateRangePicker startDate={startDate} endDate={endDate} onChange={(s,e) => {setStartDate(s); setEndDate(e)}} />
                    <button onClick={exportCSV} disabled={!data.length} className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors">
                        <Download className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {!loading && data.length > 0 && (
                <Card title="Revenue Trend" className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[...data].reverse()}>
                            <defs>
                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} />
                            <YAxis stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(v) => `${v/1000}k`} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                            <Area type="monotone" dataKey="totalSales" stroke="#6366f1" fill="url(#colorRev)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </Card>
            )}

            <Card className="p-0 overflow-hidden bg-transparent border-0 shadow-none">
                <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                    <table className="w-full text-sm text-right">
                         <thead className="bg-slate-950 text-xs font-bold text-slate-500 uppercase">
                            <tr>
                                <th className="px-6 py-4 text-left">Date</th>
                                <th className="px-4 py-4 text-indigo-400">Revenue</th>
                                <th className="px-4 py-4">Spend</th>
                                <th className="px-4 py-4 text-emerald-500">Profit (Est)</th>
                                <th className="px-4 py-4">Orders</th>
                                <th className="px-4 py-4">ACOS</th>
                                <th className="px-4 py-4">ROAS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {data.map(row => (
                                <tr key={row.date} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-3 text-left font-mono text-slate-400">{format(parseISO(row.date), 'MMM d, yyyy')}</td>
                                    <td className="px-4 py-3 font-bold text-indigo-400">₹{row.totalSales.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-slate-300">₹{row.spend.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-emerald-500">₹{(row.totalSales - row.spend).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-slate-400">{row.totalOrders}</td>
                                    <td className="px-4 py-3 text-slate-500">{(row.paidSales > 0 ? (row.spend/row.paidSales)*100 : 0).toFixed(1)}%</td>
                                    <td className="px-4 py-3 text-slate-500">{(row.spend > 0 ? row.paidSales/row.spend : 0).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
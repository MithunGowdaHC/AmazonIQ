import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../services/authContext';
import { getAccountDailyPerformance } from '../services/dataService';
import { DailyPerformance } from '../types';
import { Card } from '../components/ui/Card';
import { GoogleDateRangePicker } from '../components/ui/GoogleDateRangePicker';
import { Download, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown } from 'lucide-react';
import { subDays, format, parseISO } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type SortKey = keyof DailyPerformance | 'roas' | 'cpc' | 'cvr' | 'paidGV';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

type ChartMetric = 'overallSales' | 'spend' | 'glanceViews' | 'paidGV';

export const AccountHistory: React.FC = () => {
    const { selectedAccount } = useAuth();
    const [data, setData] = useState<DailyPerformance[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    
    // Chart State
    const [chartMetric, setChartMetric] = useState<ChartMetric>('overallSales');

    // Sorting State
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });

    useEffect(() => {
        if (selectedAccount) {
            setLoading(true);
            getAccountDailyPerformance(selectedAccount.id, { startDate, endDate })
                .then(res => {
                    setData(res);
                    setLoading(false);
                });
        }
    }, [selectedAccount, startDate, endDate]);

    // Sorting Logic
    const handleSort = (key: SortKey) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
        }));
    };

    const sortedData = useMemo(() => {
        const sorted = [...data];
        return sorted.sort((a, b) => {
            let aValue: number | string = 0;
            let bValue: number | string = 0;

            // Calculate derived metrics for sorting if needed
            const getDerived = (item: DailyPerformance, k: SortKey): number | string => {
                if (k === 'roas') return item.spend > 0 ? item.paidSales / item.spend : 0;
                if (k === 'cpc') return item.clicks > 0 ? item.spend / item.clicks : 0;
                if (k === 'cvr') return item.glanceViews > 0 ? (item.totalOrders / item.glanceViews) : 0;
                if (k === 'paidGV') return Math.round(item.glanceViews * 0.4);
                // safe access for keys that are actually on DailyPerformance
                const key = k as keyof DailyPerformance;
                const val = item[key];
                if (typeof val === 'number' || typeof val === 'string') return val;
                return 0;
            };

            aValue = getDerived(a, sortConfig.key);
            bValue = getDerived(b, sortConfig.key);

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sortConfig]);

    const exportCSV = () => {
        const headers = ["Date", "Spend", "Paid Sales", "Overall Sales", "Orders", "Impressions", "Clicks", "ROAS", "CPC", "CVR", "Idx GV", "Paid GV"];
        const rows = sortedData.map(d => {
            const paidGV = Math.round(d.glanceViews * 0.4); 
            const roas = d.spend > 0 ? d.paidSales / d.spend : 0;
            const cpc = d.clicks > 0 ? d.spend / d.clicks : 0;
            const cvr = d.glanceViews > 0 ? (d.totalOrders / d.glanceViews) * 100 : 0;

            return [
                d.date,
                d.spend,
                d.paidSales,
                d.overallSales,
                d.totalOrders,
                d.impressions,
                d.clicks,
                roas.toFixed(2),
                cpc.toFixed(2),
                cvr.toFixed(2) + "%",
                d.glanceViews,
                paidGV
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${selectedAccount?.name}_History.csv`);
        document.body.appendChild(link);
        link.click();
    };

    const SortIcon = ({ column }: { column: SortKey }) => {
        if (sortConfig.key !== column) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
        return sortConfig.direction === 'asc' 
            ? <ArrowUp className="w-3 h-3 ml-1 text-indigo-400" /> 
            : <ArrowDown className="w-3 h-3 ml-1 text-indigo-400" />;
    };

    const HeaderCell = ({ label, sortKey, align = 'right', color }: { label: string, sortKey: SortKey, align?: 'left'|'right'|'center', color?: string }) => (
        <th 
            className={`px-4 py-4 cursor-pointer hover:bg-slate-800 transition-colors select-none group ${align === 'left' ? 'text-left' : align === 'center' ? 'text-center' : 'text-right'} ${color}`}
            onClick={() => handleSort(sortKey)}
        >
            <div className={`flex items-center ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
                {label}
                <SortIcon column={sortKey} />
            </div>
        </th>
    );

    // Chart Props Configurator
    const getChartConfig = () => {
        switch(chartMetric) {
            case 'spend': return { key: 'spend', color: '#f43f5e', name: 'Spend' };
            case 'glanceViews': return { key: 'glanceViews', color: '#10b981', name: 'Indexed GV' };
            case 'paidGV': return { key: 'paidGV', color: '#8b5cf6', name: 'Paid GV' };
            default: return { key: 'overallSales', color: '#6366f1', name: 'Overall Sales' };
        }
    };

    const chartConfig = getChartConfig();
    // Remap data for chart if needed (e.g. calculating paidGV on fly if not in source)
    const chartData = data.map(d => ({
        ...d,
        // ensure numeric fields exist and are numbers
        spend: Number(d.spend ?? 0),
        paidSales: Number(d.paidSales ?? 0),
        organicSales: Number(d.organicSales ?? 0),
        totalSales: Number((d as any).totalSales ?? 0),
        // derive overallSales if backend uses totalSales or needs calc
        overallSales: Number((d as any).overallSales ?? (d as any).totalSales ?? (d.paidSales + d.organicSales)),
        // derived Ad (paid) GV
        paidGV: Number(Math.round((d.glanceViews ?? 0) * 0.4)),
    }));

    // debug: confirm the key and sample rows
    // (remove logs after you verify)
    useEffect(() => {
      console.log('chartConfig', chartConfig);
      console.log('chartData sample', chartData.slice(0,3));
    }, [chartConfig, chartData]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Account History</h1>
                    <p className="text-sm text-slate-400">Daily aggregate performance for {selectedAccount?.name}</p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
                    <GoogleDateRangePicker startDate={startDate} endDate={endDate} onChange={(s,e) => {setStartDate(s); setEndDate(e)}} />
                    <button onClick={exportCSV} disabled={!data.length} className="w-full sm:w-auto flex items-center justify-center p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors shadow-sm border border-slate-700 h-[42px]">
                        <Download className="w-5 h-5" />
                        <span className="sm:hidden ml-2">Download CSV</span>
                    </button>
                </div>
            </div>

            {!loading && data.length > 0 && (
                <Card 
                    title="Performance Trend" 
                    className="h-80"
                    action={
                        <div className="relative">
                            <select 
                                value={chartMetric}
                                onChange={(e) => setChartMetric(e.target.value as ChartMetric)}
                                className="appearance-none bg-slate-800 text-xs font-medium text-slate-200 pl-3 pr-8 py-1.5 rounded-lg border border-slate-700 hover:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer"
                            >
                                <option value="overallSales">Overall Sales</option>
                                <option value="spend">Spend</option>
                                <option value="glanceViews">Indexed GV</option>
                                <option value="paidGV">Ad GV</option>
                            </select>
                            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    }
                >
                    <div style={{ width: '100%', height: 320 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[...chartData].reverse()}>
                             <defs>
                                 <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                                     <stop offset="5%" stopColor={chartConfig.color} stopOpacity={0.3}/>
                                     <stop offset="95%" stopColor={chartConfig.color} stopOpacity={0}/>
                                 </linearGradient>
                             </defs>
                             <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                             <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} />
                             <YAxis stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toString()} />
                             <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f1f5f9' }} />
                            <Area
                                type="monotone"
                                dataKey={chartConfig.key}
                                stroke={chartConfig.color}
                                fill="url(#colorMetric)"
                                name={chartConfig.name}
                                isAnimationActive={false}
                                dot={false}
                            />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                 </Card>
            )}

            <Card className="p-0 overflow-hidden bg-transparent border-0 shadow-none">
                <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl shadow-black/20">
                    <div className="overflow-x-auto scrollbar-hide">
                        <table className="w-full text-sm text-right whitespace-nowrap">
                             <thead className="bg-slate-950 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800">
                                <tr>
                                    <th className="px-6 py-4 text-left sticky left-0 bg-slate-950 z-10 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('date')}>
                                        <div className="flex items-center">Date <SortIcon column="date" /></div>
                                    </th>
                                    <HeaderCell label="Spend" sortKey="spend" />
                                    <HeaderCell label="Paid Sales" sortKey="paidSales" />
                                    <HeaderCell label="Overall Sales" sortKey="overallSales" color="text-indigo-400" />
                                    <HeaderCell label="Orders" sortKey="totalOrders" />
                                    <HeaderCell label="Impr." sortKey="impressions" />
                                    <HeaderCell label="Clicks" sortKey="clicks" />
                                    <HeaderCell label="ROAS" sortKey="roas" />
                                    <HeaderCell label="CPC" sortKey="cpc" />
                                    <HeaderCell label="CVR" sortKey="cvr" color="text-emerald-500" />
                                    <HeaderCell label="Idx GV" sortKey="glanceViews" />
                                    <HeaderCell label="Paid GV" sortKey="paidGV" color="text-slate-400" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50 font-mono text-xs">
                                {sortedData.map(row => {
                                    const paidGV = Math.round(row.glanceViews * 0.4); 
                                    const roas = row.spend > 0 ? row.paidSales / row.spend : 0;
                                    const cpc = row.clicks > 0 ? row.spend / row.clicks : 0;
                                    const cvr = row.glanceViews > 0 ? (row.totalOrders / row.glanceViews) * 100 : 0;
                                    
                                    const paidShare = row.glanceViews > 0 ? (paidGV / row.glanceViews) * 100 : 0;

                                    return (
                                        <tr key={row.date} className="hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-6 py-3.5 text-left font-sans text-slate-300 sticky left-0 bg-slate-900 group-hover:bg-slate-800/30 border-r border-slate-800">
                                                {format(parseISO(row.date), 'MMM d, yyyy')}
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-300">₹{row.spend.toLocaleString()}</td>
                                            <td className="px-4 py-3.5 text-slate-300">₹{row.paidSales.toLocaleString()}</td>
                                            <td className="px-4 py-3.5 font-bold text-indigo-400">₹{Math.round(row.overallSales).toLocaleString()}</td>
                                            <td className="px-4 py-3.5 text-slate-400">{row.totalOrders}</td>
                                            <td className="px-4 py-3.5 text-slate-500">{row.impressions.toLocaleString()}</td>
                                            <td className="px-4 py-3.5 text-slate-500">{row.clicks.toLocaleString()}</td>
                                            <td className="px-4 py-3.5 text-slate-300">{roas.toFixed(2)}</td>
                                            <td className="px-4 py-3.5 text-slate-300">₹{cpc.toFixed(2)}</td>
                                            <td className="px-4 py-3.5 text-emerald-500 font-bold">{cvr.toFixed(2)}%</td>
                                            <td className="px-4 py-3.5 text-slate-400">{row.glanceViews.toLocaleString()}</td>
                                            <td className="px-4 py-3.5 text-slate-500">
                                                <div>{paidGV.toLocaleString()}</div>
                                                <div className="text-[10px] text-slate-600 font-mono">({paidShare.toFixed(0)}%)</div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default AccountHistory;

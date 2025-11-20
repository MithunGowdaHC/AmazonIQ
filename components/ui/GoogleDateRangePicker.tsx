import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, parseISO, subMonths } from 'date-fns';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

type Preset = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'custom';

export const GoogleDateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<Preset>('last30');
  const [tempStart, setTempStart] = useState<string>(startDate);
  const [tempEnd, setTempEnd] = useState<string>(endDate);
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const presets = [
    { key: 'today', label: 'Today', getRange: () => ({ start: new Date(), end: new Date() }) },
    { key: 'yesterday', label: 'Yesterday', getRange: () => ({ start: subDays(new Date(), 1), end: subDays(new Date(), 1) }) },
    { key: 'last7', label: 'Last 7 Days', getRange: () => ({ start: subDays(new Date(), 7), end: subDays(new Date(), 1) }) },
    { key: 'last30', label: 'Last 30 Days', getRange: () => ({ start: subDays(new Date(), 30), end: subDays(new Date(), 1) }) },
    { key: 'thisMonth', label: 'This Month', getRange: () => ({ start: startOfMonth(new Date()), end: new Date() }) },
    { key: 'lastMonth', label: 'Last Month', getRange: () => ({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) }) },
  ];

  const handlePresetClick = (presetKey: string) => {
    const preset = presets.find(p => p.key === presetKey);
    if (preset) {
      const range = preset.getRange();
      const s = format(range.start, 'yyyy-MM-dd');
      const e = format(range.end, 'yyyy-MM-dd');
      setTempStart(s);
      setTempEnd(e);
      setActivePreset(presetKey as Preset);
      onChange(s, e);
      setIsOpen(false);
    }
  };

  const handleApply = () => {
    onChange(tempStart, tempEnd);
    setActivePreset('custom');
    setIsOpen(false);
  };

  const formatDateDisplay = (dateStr: string) => {
    try {
        return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch (e) {
        return dateStr;
    }
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-slate-900 border border-slate-700 hover:border-indigo-500/50 text-slate-300 hover:text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-all w-full sm:w-auto group"
      >
        <CalendarIcon className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
        <span className="whitespace-nowrap tracking-tight">
          {formatDateDisplay(startDate)} - {formatDateDisplay(endDate)}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-slate-950 rounded-xl shadow-2xl shadow-black border border-slate-800 z-50 flex flex-col md:flex-row overflow-hidden w-[90vw] max-w-[600px] md:w-auto animate-in fade-in zoom-in-95 duration-150 origin-top-right ring-1 ring-slate-800">
          
          {/* Sidebar Presets */}
          <div className="w-full md:w-48 bg-slate-900/50 border-b md:border-b-0 md:border-r border-slate-800 p-2 flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase px-3 py-2 tracking-wider">Quick Select</span>
            {presets.map((preset) => (
              <button
                key={preset.key}
                onClick={() => handlePresetClick(preset.key)}
                className={`text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  activePreset === preset.key
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
            <div className="my-2 border-t border-slate-800 mx-3"></div>
            <button
              onClick={() => setActivePreset('custom')}
              className={`text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activePreset === 'custom'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              Custom Range
            </button>
          </div>

          {/* Custom Range Inputs */}
          <div className="p-6 flex-1 bg-slate-950">
             <div className="flex items-center justify-between mb-5">
                 <h4 className="text-sm font-semibold text-slate-200">Select Date Range</h4>
             </div>

             <div className="grid grid-cols-2 gap-4 mb-8">
                 <div className="space-y-2">
                     <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Start Date</label>
                     <div className="relative group">
                         <input 
                             type="date" 
                             value={tempStart}
                             max={tempEnd}
                             onChange={(e) => setTempStart(e.target.value)}
                             className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer hover:border-slate-600 shadow-sm"
                         />
                     </div>
                 </div>
                 <div className="space-y-2">
                     <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">End Date</label>
                     <div className="relative group">
                        <input 
                             type="date" 
                             value={tempEnd}
                             min={tempStart}
                             onChange={(e) => setTempEnd(e.target.value)}
                             className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer hover:border-slate-600 shadow-sm"
                         />
                     </div>
                 </div>
             </div>

             <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button 
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleApply}
                    className="px-6 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-900/20 transition-all active:scale-95"
                >
                    Apply Dates
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
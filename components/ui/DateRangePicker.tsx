import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, onChange }) => {
  return (
    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all">
      <div className="px-2 text-slate-400">
        <CalendarIcon className="w-4 h-4" />
      </div>
      
      <div className="flex items-center">
        <div className="relative group">
          <input 
            type="date" 
            value={startDate}
            max={endDate}
            onChange={(e) => onChange(e.target.value, endDate)}
            className="outline-none text-slate-700 text-sm font-medium bg-transparent cursor-pointer py-1 px-2 hover:bg-slate-50 rounded transition-colors"
          />
        </div>
        
        <span className="text-slate-400 text-xs px-1">to</span>
        
        <div className="relative group">
          <input 
            type="date" 
            value={endDate}
            min={startDate}
            onChange={(e) => onChange(startDate, e.target.value)}
            className="outline-none text-slate-700 text-sm font-medium bg-transparent cursor-pointer py-1 px-2 hover:bg-slate-50 rounded transition-colors"
          />
        </div>
      </div>
    </div>
  );
};
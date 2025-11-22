
import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import { 
  format, subDays, startOfMonth, endOfMonth, parseISO, subMonths, 
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, 
  isWithinInterval, addMonths, isAfter, isBefore, isValid
} from 'date-fns';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

type Preset = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'custom';

export const GoogleDateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<Preset>('last30');
  
  // Calendar State
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [selectionStart, setSelectionStart] = useState<Date | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize state from props when opening
  useEffect(() => {
    if (isOpen) {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      if (isValid(start)) setSelectionStart(start);
      if (isValid(end)) setSelectionEnd(end);
      if (isValid(end)) setViewDate(end); // Show the end month by default
    }
  }, [isOpen, startDate, endDate]);

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
      setSelectionStart(range.start);
      setSelectionEnd(range.end);
      setViewDate(range.end);
      setActivePreset(presetKey as Preset);
      
      // Apply immediately
      onChange(format(range.start, 'yyyy-MM-dd'), format(range.end, 'yyyy-MM-dd'));
      setIsOpen(false);
    }
  };

  const handleDateClick = (date: Date) => {
    setActivePreset('custom');
    
    if (!selectionStart || (selectionStart && selectionEnd)) {
      // Start new selection
      setSelectionStart(date);
      setSelectionEnd(null);
    } else {
      // Complete selection
      if (isBefore(date, selectionStart)) {
        setSelectionEnd(selectionStart);
        setSelectionStart(date);
      } else {
        setSelectionEnd(date);
      }
    }
  };

  const handleApply = () => {
    if (selectionStart && selectionEnd) {
      onChange(format(selectionStart, 'yyyy-MM-dd'), format(selectionEnd, 'yyyy-MM-dd'));
      setIsOpen(false);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    try {
        return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch (e) {
        return dateStr;
    }
  };

  // Calendar Grid Generation
  const generateCalendarDays = () => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    
    return eachDayOfInterval({ start: startDate, end: endDate });
  };

  const days = generateCalendarDays();
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const nextMonth = () => setViewDate(addMonths(viewDate, 1));
  const prevMonth = () => setViewDate(subMonths(viewDate, 1));

  // Style Helpers
  const getDayClass = (day: Date) => {
    const isSelectedStart = selectionStart && isSameDay(day, selectionStart);
    const isSelectedEnd = selectionEnd && isSameDay(day, selectionEnd);
    const isSelected = isSelectedStart || isSelectedEnd;
    
    const isInRange = selectionStart && selectionEnd && isWithinInterval(day, { start: selectionStart, end: selectionEnd });
    const isHoverRange = !selectionEnd && selectionStart && hoverDate && isWithinInterval(day, { 
        start: isBefore(day, selectionStart) ? day : selectionStart, 
        end: isAfter(day, selectionStart) ? day : selectionStart 
    });

    const isCurrentMonth = isSameMonth(day, viewDate);
    const isToday = isSameDay(day, new Date());

    let classes = "relative w-9 h-9 text-xs font-medium flex items-center justify-center rounded-full transition-all cursor-pointer select-none z-10 ";

    if (!isCurrentMonth) {
        classes += "text-slate-600 ";
    } else {
        classes += "text-slate-300 ";
    }

    if (isSelected) {
        classes += "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-900/50 ";
    } else if (isInRange) {
        classes += "bg-indigo-500/20 text-indigo-200 rounded-none "; // Connect range
        // Add rounded corners to ends of range if not selected (though they usually are)
    } else if (isHoverRange) {
        classes += "bg-indigo-500/10 text-indigo-200 ";
    } else if (isCurrentMonth && !isSelected) {
        classes += "hover:bg-slate-800 hover:text-white ";
    }

    if (isToday && !isSelected && !isInRange) {
        classes += "border border-indigo-500/50 text-indigo-400 ";
    }

    return classes;
  };

  return (
    <div className="relative inline-block text-left w-full sm:w-auto" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-700 hover:border-indigo-500/50 text-slate-300 hover:text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-all w-full sm:w-auto group"
      >
        <div className="flex items-center gap-3">
            <CalendarIcon className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
            <span className="whitespace-nowrap tracking-tight">
              {formatDateDisplay(startDate)} - {formatDateDisplay(endDate)}
            </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-slate-950 rounded-xl shadow-2xl shadow-black border border-slate-800 z-50 flex flex-col md:flex-row overflow-hidden w-[90vw] max-w-[650px] md:w-auto animate-in fade-in zoom-in-95 duration-150 origin-top-right ring-1 ring-slate-800">
          
          {/* Sidebar Presets */}
          <div className="w-full md:w-40 bg-slate-900/50 border-b md:border-b-0 md:border-r border-slate-800 p-2 flex flex-col gap-0.5 shrink-0">
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
          </div>

          {/* Custom Calendar */}
          <div className="p-5 bg-slate-950 flex-1">
             {/* Calendar Header */}
             <div className="flex items-center justify-between mb-4 px-1">
                 <div className="flex items-center gap-2">
                    <button 
                        onClick={prevMonth}
                        className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors border border-slate-800 hover:border-slate-700"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-bold text-slate-200 min-w-[100px] text-center">
                        {format(viewDate, 'MMMM yyyy')}
                    </span>
                    <button 
                        onClick={nextMonth}
                        className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors border border-slate-800 hover:border-slate-700"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                 </div>
                 
                 {/* Selected Range Display */}
                 <div className="text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-md border border-slate-800 font-mono">
                    {selectionStart ? format(selectionStart, 'MMM d') : 'Select'} 
                    {' - '}
                    {selectionEnd ? format(selectionEnd, 'MMM d') : '...'}
                 </div>
             </div>

             {/* Calendar Grid */}
             <div className="mb-4">
                 {/* Weekday Headers */}
                 <div className="grid grid-cols-7 mb-2">
                     {weekDays.map(d => (
                         <div key={d} className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider py-1">
                             {d}
                         </div>
                     ))}
                 </div>
                 
                 {/* Days */}
                 <div 
                    className="grid grid-cols-7 gap-y-1 gap-x-0 relative"
                    onMouseLeave={() => setHoverDate(null)}
                 >
                     {days.map((day, idx) => (
                         <div 
                            key={day.toISOString()} 
                            className="flex justify-center relative py-0.5"
                            onMouseEnter={() => setHoverDate(day)}
                            onClick={() => handleDateClick(day)}
                         >
                            {/* Range Connector Strip */}
                            {selectionStart && selectionEnd && isWithinInterval(day, { start: selectionStart, end: selectionEnd }) && (
                                <div className={`absolute inset-y-0.5 bg-indigo-500/20 z-0
                                    ${isSameDay(day, selectionStart) ? 'left-1/2 right-0 rounded-l-none' : ''}
                                    ${isSameDay(day, selectionEnd) ? 'left-0 right-1/2 rounded-r-none' : ''}
                                    ${!isSameDay(day, selectionStart) && !isSameDay(day, selectionEnd) ? 'left-0 right-0' : ''}
                                `}></div>
                            )}
                            
                             <div className={getDayClass(day)}>
                                 {format(day, 'd')}
                             </div>
                         </div>
                     ))}
                 </div>
             </div>

             <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                    <Globe className="w-3 h-3" />
                    Asia/Kolkata
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleApply}
                        disabled={!selectionStart || !selectionEnd}
                        className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        Apply
                    </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = "", title, subtitle, action }) => {
  return (
    <div className={`bg-slate-900 rounded-xl border border-slate-800 shadow-xl shadow-black/20 overflow-hidden ${className}`}>
      {(title || subtitle || action) && (
        <div className="px-6 py-5 border-b border-slate-800/50 flex justify-between items-start">
          <div>
            {title && <h3 className="font-semibold text-slate-200 text-base tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};
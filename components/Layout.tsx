
import React, { useState } from 'react';
import { useAuth } from '../services/authContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  LogOut, 
  ChevronDown, 
  Hexagon,
  History,
  Search,
  Heart,
  BarChart2,
  Menu,
  X
} from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, selectedAccount, selectAccount, availableAccounts, isAccessDenied } = useAuth();
  const location = useLocation();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
      if (path === '/dashboard') return location.pathname === '/dashboard';
      return location.pathname.startsWith(path);
  };

  if (isAccessDenied) {
      return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans text-slate-100 selection:bg-indigo-500 selection:text-white">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 z-40 md:translate-x-0 md:static md:flex-shrink-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
             <Link to="/" className="flex items-center gap-3 group" onClick={() => setIsMobileMenuOpen(false)}>
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition-all">
                    <Hexagon className="text-white w-5 h-5 fill-indigo-600" />
                </div>
                <span className="font-bold text-white text-lg tracking-tight">Retail Hive</span>
            </Link>
            <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
            </button>
        </div>

        <div className="p-4">
            <div className="relative">
                <button 
                    onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 p-3 rounded-xl flex items-center justify-between transition-colors border border-slate-700/50 group"
                >
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex-shrink-0 ring-2 ring-slate-800 group-hover:ring-indigo-500/50 transition-all"></div>
                        <span className="truncate text-sm font-medium">{selectedAccount?.name || 'Select Account'}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isAccountMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isAccountMenuOpen && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                        {availableAccounts.map(acc => (
                            <button
                                key={acc.id}
                                onClick={() => {
                                    selectAccount(acc.id);
                                    setIsAccountMenuOpen(false);
                                    setIsMobileMenuOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${selectedAccount?.id === acc.id ? 'bg-indigo-600/10 text-indigo-400 font-medium' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'}`}
                            >
                                {acc.id === 'Stahl' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                                {acc.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-2 overflow-y-auto scrollbar-hide">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-3 mt-2">Overview</p>
          <Link 
            to="/dashboard" 
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive('/dashboard') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>

          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-3 mt-6">Deep Dive</p>
          <Link 
            to="/analytics" 
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive('/analytics') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
          >
            <BarChart2 className="w-4 h-4" />
            ASIN Analytics
          </Link>
          <Link 
            to="/history" 
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive('/history') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
          >
            <History className="w-4 h-4" />
            Account History
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800/50">
            <div className="flex items-center gap-3 px-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-indigo-300 border border-slate-600">
                    {user?.name.charAt(0)}
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm text-slate-200 font-medium truncate">{user?.name}</p>
                    <p className="text-xs text-slate-500 truncate font-mono">{user?.email}</p>
                </div>
            </div>
            <button className="w-full flex items-center gap-2 text-slate-500 hover:text-slate-300 px-2 py-2 text-sm transition-colors">
                <LogOut className="w-4 h-4" />
                Sign Out
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden h-screen relative bg-slate-950 w-full">
        {/* Top Blur Effect */}
        <div className="absolute top-0 left-0 w-full h-96 bg-indigo-900/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

        <header className="h-16 flex items-center justify-between px-4 md:px-8 shrink-0 z-10 border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-sm sticky top-0">
            <div className="flex items-center gap-4">
                <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
                    <Menu className="w-5 h-5" />
                </button>
                <h1 className="text-lg md:text-xl font-semibold text-slate-100 tracking-tight truncate">
                    {location.pathname === '/dashboard' ? 'Overview' : 
                    location.pathname.startsWith('/analytics') ? 'ASIN Intelligence' : 
                    location.pathname === '/history' ? 'Account Performance' : 'Retail Hive'}
                </h1>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-[10px] md:text-xs px-2 md:px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-medium flex items-center gap-1.5">
                    <span className="relative flex h-1.5 w-1.5 md:h-2 md:w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 md:h-2 md:w-2 bg-emerald-500"></span>
                    </span>
                    <span className="hidden md:inline">Live Data</span>
                    <span className="md:hidden">Live</span>
                </div>
            </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 scrollbar-hide z-10 flex flex-col">
            <div className="flex-1">
                {children}
            </div>
            
            {/* Footer */}
            <footer className="mt-12 border-t border-slate-800/50 pt-6 pb-2">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                        <span>&copy; 2025 AV Retail Hive.</span>
                        <span className="hidden md:inline">All rights reserved.</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="#" className="hover:text-indigo-400 transition-colors">Privacy</Link>
                        <Link to="#" className="hover:text-indigo-400 transition-colors">Terms</Link>
                        <Link to="#" className="hover:text-indigo-400 transition-colors">Support</Link>
                    </div>
                    <div className="flex items-center gap-1 opacity-50">
                        <span>Made with</span>
                        <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                        <span className="hidden md:inline">by Intelligence Team</span>
                    </div>
                </div>
            </footer>
        </div>
      </main>
    </div>
  );
};

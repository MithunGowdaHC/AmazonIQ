import React from 'react';
import Link from 'next/link';
import { Hexagon, ArrowRight, BarChart3, ShieldCheck, Zap } from 'lucide-react';

export const Welcome: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]"></div>
      </div>

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6 z-10">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Hexagon className="text-white w-6 h-6 fill-indigo-600" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-100">AV Retail Hive</span>
        </div>
        <div className="flex items-center gap-6">
           <Link href="/dashboard" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Dashboard</Link>
           <Link href="/history" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">History</Link>
        </div>
      </nav>

      {/* Hero Content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 z-10 max-w-5xl mx-auto mt-[-40px]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/50 border border-slate-800 text-xs font-medium text-indigo-400 mb-8 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Live System Online v2.4
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white via-slate-200 to-slate-500">
            The Intelligence Layer for <br />
            <span className="text-indigo-500">Amazon Retail</span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
            Unify your Ads, Sales, and Traffic data into a single source of truth. 
            Stop guessing. Start dominating your category with precision analytics.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              href="/dashboard" 
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-lg transition-all shadow-xl shadow-indigo-900/40 flex items-center gap-2 group"
            >
                Access Dashboard
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
             <button className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 hover:border-slate-700 rounded-xl font-bold text-lg transition-all">
                Read Documentation
            </button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full text-left">
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800/50 backdrop-blur-sm hover:bg-slate-900 transition-colors">
                <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center mb-4">
                    <BarChart3 className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Real-time Data</h3>
                <p className="text-sm text-slate-400">Instant analysis at the ASIN level, factoring in ad spend and organic lift.</p>
            </div>
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800/50 backdrop-blur-sm hover:bg-slate-900 transition-colors">
                <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Traffic Attribution</h3>
                <p className="text-sm text-slate-400">Distinguish between Paid and Organic Glance Views to optimize your funnel efficiency.</p>
            </div>
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800/50 backdrop-blur-sm hover:bg-slate-900 transition-colors">
                <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center mb-4">
                    <ShieldCheck className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Enterprise Security</h3>
                <p className="text-sm text-slate-400">Role-based access control ensures stakeholders only see data relevant to their brand.</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
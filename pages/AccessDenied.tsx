import React from 'react';
import { ShieldAlert, Lock } from 'lucide-react';
import { useAuth } from '../services/authContext';

export const AccessDenied: React.FC = () => {
  const { selectedAccount, selectAccount, availableAccounts, hasAccessToAccount } = useAuth();

  // Find an account they actually have access to for the "Go back" button
  const allowedAccount = availableAccounts.find(a => hasAccessToAccount(a.id));

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-indigo-500 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-0 w-80 h-80 bg-red-500 rounded-full blur-3xl"></div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 p-12 rounded-2xl max-w-lg w-full text-center shadow-2xl relative z-10">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-slate-400 mb-8">
          You do not have permission to view data for <span className="text-white font-semibold">{selectedAccount?.name}</span>.
        </p>

        <div className="bg-slate-900/50 rounded-lg p-4 text-left mb-8 border border-slate-700">
            <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-indigo-400 mt-0.5" />
                <div>
                    <p className="text-sm text-slate-300 font-medium">Request Access</p>
                    <p className="text-xs text-slate-500 mt-1">
                        Contact the administrator to request access to this account bucket.
                    </p>
                    <a href="mailto:mithun.gowda@hiveminds.in" className="text-indigo-400 hover:text-indigo-300 text-xs mt-2 block transition-colors">
                        mithun.gowda@hiveminds.in
                    </a>
                </div>
            </div>
        </div>

        {allowedAccount && (
            <button 
                onClick={() => selectAccount(allowedAccount.id)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition-all shadow-lg shadow-indigo-900/20"
            >
                Return to {allowedAccount.name}
            </button>
        )}
      </div>
    </div>
  );
};

export default AccessDenied;
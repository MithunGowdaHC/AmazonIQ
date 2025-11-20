import React, { createContext, useContext, useState, useEffect } from 'react';
import { Account, User } from '../types';
import { ACCOUNTS, MOCK_USER } from './mockData';

interface AuthContextType {
  user: User | null;
  selectedAccount: Account | null;
  availableAccounts: Account[];
  selectAccount: (accountId: string) => void;
  hasAccessToAccount: (accountId: string) => boolean;
  isAccessDenied: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isAccessDenied, setIsAccessDenied] = useState(false);

  useEffect(() => {
    // Mock login
    setUser(MOCK_USER);
    // Default to first account
    if (ACCOUNTS.length > 0) {
         setSelectedAccount(ACCOUNTS[0]);
    }
  }, []);

  const hasAccessToAccount = (accountId: string) => {
      // Mock: Always allow for demo
      return true;
  };

  const selectAccount = (accountId: string) => {
    const account = ACCOUNTS.find(a => a.id === accountId);
    if (account) {
      setSelectedAccount(account);
      setIsAccessDenied(false); 
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      selectedAccount, 
      availableAccounts: ACCOUNTS, 
      selectAccount,
      hasAccessToAccount,
      isAccessDenied
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import React, { createContext, useContext, useEffect, useState } from 'react';
import { LoadingOverlay } from '@mantine/core';
import { initAuth } from '../services/api';

interface AuthState {
  token: string;
  isNew: boolean;
  openRecoveryModal: () => void;
  recoveryModalOpen: boolean;
  closeRecoveryModal: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export const useAuth = (): AuthState => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string>('');
  const [isNew, setIsNew] = useState(false);
  const [ready, setReady] = useState(false);
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);

  useEffect(() => {
    initAuth()
      .then(({ token: t, isNew: n }) => {
        setToken(t);
        setIsNew(n);
        if (n) setRecoveryModalOpen(true);
      })
      .catch(() => {
        // Silently fail — user will see an empty app; API calls will 401
      })
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div style={{ height: '100vh', position: 'relative' }}>
        <LoadingOverlay visible />
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        isNew,
        openRecoveryModal: () => setRecoveryModalOpen(true),
        recoveryModalOpen,
        closeRecoveryModal: () => setRecoveryModalOpen(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

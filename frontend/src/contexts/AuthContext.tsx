import React, { createContext, useContext, useEffect, useState } from 'react';
import { LoadingOverlay } from '@mantine/core';
import { initAuth, updateHomeName } from '../services/api';

interface AuthState {
  token: string;
  isNew: boolean;
  homeName: string;
  setHomeName: (name: string) => Promise<void>;
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
  const [homeName, setHomeNameState] = useState('Home Organizer');
  const [ready, setReady] = useState(false);
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);

  useEffect(() => {
    initAuth()
      .then(({ token: t, isNew: n, name }) => {
        setToken(t);
        setIsNew(n);
        setHomeNameState(name ?? 'Home Organizer');
        if (n) setRecoveryModalOpen(true);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setHomeName = async (name: string) => {
    const saved = await updateHomeName(name);
    setHomeNameState(saved);
  };

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
        homeName,
        setHomeName,
        openRecoveryModal: () => setRecoveryModalOpen(true),
        recoveryModalOpen,
        closeRecoveryModal: () => setRecoveryModalOpen(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

import React, { createContext, useContext, useEffect, useState } from 'react';
import { LoadingOverlay } from '@mantine/core';
import { initAuth, updateHomeName, switchHome as switchHomeApi } from '../services/api';

export interface StoredHome {
  token: string;
  name: string;
}

const LS_KEY = 'home_organizer_homes';

function getStoredHomes(): StoredHome[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function upsertStoredHome(token: string, name: string): StoredHome[] {
  const homes = getStoredHomes();
  const idx = homes.findIndex((h) => h.token === token);
  if (idx >= 0) homes[idx].name = name;
  else homes.push({ token, name });
  localStorage.setItem(LS_KEY, JSON.stringify(homes));
  return homes;
}

function removeStoredHome(token: string): StoredHome[] {
  const homes = getStoredHomes().filter((h) => h.token !== token);
  localStorage.setItem(LS_KEY, JSON.stringify(homes));
  return homes;
}

interface AuthState {
  token: string;
  isNew: boolean;
  homeName: string;
  homes: StoredHome[];
  setHomeName: (name: string) => Promise<void>;
  switchHome: (token: string) => Promise<void>;
  leaveHome: (token: string) => void;
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
  const [homes, setHomes] = useState<StoredHome[]>(getStoredHomes);
  const [ready, setReady] = useState(false);
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);

  useEffect(() => {
    initAuth()
      .then(({ token: t, isNew: n, name }) => {
        setToken(t);
        setIsNew(n);
        setHomeNameState(name ?? 'Home Organizer');
        if (n) setRecoveryModalOpen(true);
        // Always sync the active home into localStorage so the list stays current
        setHomes(upsertStoredHome(t, name ?? 'Home Organizer'));
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setHomeName = async (name: string) => {
    const saved = await updateHomeName(name);
    setHomeNameState(saved);
    // Keep the name in localStorage in sync
    setHomes(upsertStoredHome(token, saved));
  };

  const switchHome = async (targetToken: string) => {
    await switchHomeApi(targetToken);
    // Full reload so the new httpOnly cookie is picked up by all API calls
    // and all room/item data is re-fetched fresh for the new home.
    window.location.reload();
  };

  const leaveHome = (targetToken: string) => {
    if (targetToken === token) return; // can't leave the active home
    setHomes(removeStoredHome(targetToken));
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
        homes,
        setHomeName,
        switchHome,
        leaveHome,
        openRecoveryModal: () => setRecoveryModalOpen(true),
        recoveryModalOpen,
        closeRecoveryModal: () => setRecoveryModalOpen(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

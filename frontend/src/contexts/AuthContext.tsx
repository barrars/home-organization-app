import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { LoadingOverlay } from '@mantine/core';
import { initAuth, updateHomeName, switchHome as switchHomeApi, rotateHomeToken } from '../services/api';
import { getSocket } from '../services/socket';

const ACTIVE_ID_KEY = 'home_organizer_active_id';

export interface StoredHome {
  id: string;
  token: string;
  name: string;
}

const LS_KEY = 'home_organizer_homes';

export function getStoredHomes(): StoredHome[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function upsertStoredHome(id: string, token: string, name: string): StoredHome[] {
  const homes = getStoredHomes();
  const idx = homes.findIndex((h) => h.token === token);
  if (idx >= 0) {
    homes[idx].name = name;
    homes[idx].id = id;
  } else homes.push({ id, token, name });
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
  rotateToken: () => Promise<string>;
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
  // Guard against React StrictMode's intentional double-mount firing initAuth twice.
  // In StrictMode, useRef values are preserved across the artificial unmount/remount
  // cycle, so the second mount sees current=true and bails out.
  const initCalledRef = useRef(false);

  useEffect(() => {
    if (initCalledRef.current) return;
    initCalledRef.current = true;
    initAuth()
      .then(({ id, token: t, isNew: n, name }) => {
        setToken(t);
        setIsNew(n);
        setHomeNameState(name ?? 'Home Organizer');
        if (n) setRecoveryModalOpen(true);
        // Always sync the active home into localStorage so the list stays current
        setHomes(upsertStoredHome(String(id), t, name ?? 'Home Organizer'));
        localStorage.setItem(ACTIVE_ID_KEY, String(id));
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setHomeName = async (name: string) => {
    const saved = await updateHomeName(name);
    setHomeNameState(saved);
    // Keep the name in localStorage in sync
    const activeId = localStorage.getItem(ACTIVE_ID_KEY) ?? '';
    setHomes(upsertStoredHome(activeId, token, saved));
  };

  // Listen for home:renamed events from other clients in the same household
  useEffect(() => {
    if (!token) return;
    const socket = getSocket();
    const handler = ({ name }: { name: string }) => {
      setHomeNameState(name);
      const activeId = localStorage.getItem(ACTIVE_ID_KEY) ?? '';
      setHomes((prev) => {
        const updated = prev.map((h) =>
          h.id === activeId ? { ...h, name } : h,
        );
        localStorage.setItem('home_organizer_homes', JSON.stringify(updated));
        return updated;
      });
    };
    socket.on('home:renamed', handler);
    return () => { socket.off('home:renamed', handler); };
  }, [token]);

  const switchHome = async (targetToken: string) => {
    const result = await switchHomeApi(targetToken);
    // Store the new active id before reload so the socket handler can compare correctly
    if (result.id) localStorage.setItem(ACTIVE_ID_KEY, String(result.id));
    // Full reload so the new httpOnly cookie is picked up by all API calls
    // and all room/item data is re-fetched fresh for the new home.
    window.location.reload();
  };

  const leaveHome = (targetToken: string) => {
    if (targetToken === token) return; // can't leave the active home
    setHomes(removeStoredHome(targetToken));
  };

  const rotateToken = async (): Promise<string> => {
    const { token: newToken, joinUrl } = await rotateHomeToken();
    // Replace the old token in localStorage with the new one
    const activeId = localStorage.getItem(ACTIVE_ID_KEY) ?? '';
    setToken(newToken);
    setHomes(upsertStoredHome(activeId, newToken, homeName));
    // Remove the stale old-token entry if it exists separately
    setHomes((prev) => {
      const deduped = prev.filter((h) => h.id === activeId || h.token === newToken);
      localStorage.setItem(LS_KEY, JSON.stringify(deduped));
      return deduped;
    });
    return joinUrl;
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
        rotateToken,
        openRecoveryModal: () => setRecoveryModalOpen(true),
        recoveryModalOpen,
        closeRecoveryModal: () => setRecoveryModalOpen(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { getRooms, getItemCountsByRoom, getDumpsterCount, getYardSaleCount } from '../services/api';
import { getSocket } from '../services/socket';
import type { Room } from '../types';

interface RoomsContextType {
  rooms: Room[];
  loading: boolean;
  refresh: () => void;
  removeRoom: (id: string) => void;
  itemCounts: Record<string, number>;
  dumpsterCount: number;
  yardSaleCount: number;
  refreshCounts: () => void;
}

const RoomsContext = createContext<RoomsContextType>({
  rooms: [],
  loading: true,
  refresh: () => {},
  removeRoom: () => {},
  itemCounts: {},
  dumpsterCount: 0,
  yardSaleCount: 0,
  refreshCounts: () => {},
});

export const RoomsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [dumpsterCount, setDumpsterCount] = useState(0);
  const [yardSaleCount, setYardSaleCount] = useState(0);

  const refreshCounts = useCallback(async () => {
    try {
      const [counts, dumpster, yardSale] = await Promise.all([getItemCountsByRoom(), getDumpsterCount(), getYardSaleCount()]);
      setItemCounts(counts);
      setDumpsterCount(dumpster.total);
      setYardSaleCount(yardSale.total);
    } catch {
      // counts are non-critical — fail silently
    }
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    getRooms()
      .then(setRooms)
      .finally(() => setLoading(false));
    refreshCounts();
  }, [refreshCounts]);

  const removeRoom = useCallback((id: string) => {
    setRooms((prev) => prev.filter((r) => r._id !== id));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Keep a ref so the socket handler always calls the latest refresh()
  // without needing to re-register listeners on every render.
  const refreshRef = useRef(refresh);
  useEffect(() => { refreshRef.current = refresh; });

  useEffect(() => {
    const socket = getSocket();
    const handle = () => refreshRef.current();
    const events = [
      'item:created', 'item:updated', 'item:deleted',
      'item:restored', 'item:destroyed',
      'room:created', 'room:updated', 'room:deleted',
      'room:restored', 'room:destroyed',
      'dumpster:wiped',
    ];
    events.forEach((e) => socket.on(e, handle));
    return () => { events.forEach((e) => socket.off(e, handle)); };
  }, []); // empty — registers once for the lifetime of the provider

  return (
    <RoomsContext.Provider value={{ rooms, loading, refresh, removeRoom, itemCounts, dumpsterCount, yardSaleCount, refreshCounts }}>{children}</RoomsContext.Provider>
  );
};

export const useRooms = () => useContext(RoomsContext);

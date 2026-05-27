import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { getRooms, getItemCountsByRoom, getDumpsterCount, getYardSaleCount } from '../services/api';
import { getSocket } from '../services/socket';
import type { Room } from '../types';

interface RoomsContextType {
  rooms: Room[];
  loading: boolean;
  refresh: () => void;
  backgroundRefresh: () => void;
  removeRoom: (id: string) => void;
  newRoomIds: Set<string>;
  itemCounts: Record<string, number>;
  dumpsterCount: number;
  yardSaleCount: number;
  refreshCounts: () => void;
}

const RoomsContext = createContext<RoomsContextType>({
  rooms: [],
  loading: true,
  refresh: () => {},
  backgroundRefresh: () => {},
  removeRoom: () => {},
  newRoomIds: new Set(),
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
  const [newRoomIds, setNewRoomIds] = useState<Set<string>>(new Set());

  const roomsRef = useRef<Room[]>([]);
  roomsRef.current = rooms;

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

  const backgroundRefresh = useCallback(async () => {
    try {
      const [data, counts, dumpster, yardSale] = await Promise.all([
        getRooms(), getItemCountsByRoom(), getDumpsterCount(), getYardSaleCount(),
      ]);
      const prevIds = new Set(roomsRef.current.map((r) => r._id));
      const added = new Set(data.filter((r) => !prevIds.has(r._id)).map((r) => r._id));
      setRooms(data);
      setItemCounts(counts);
      setDumpsterCount(dumpster.total);
      setYardSaleCount(yardSale.total);
      if (added.size > 0) {
        setNewRoomIds(added);
        setTimeout(() => setNewRoomIds(new Set()), 600);
      }
    } catch {
      // non-critical
    }
  }, []);

  const removeRoom = useCallback((id: string) => {
    setRooms((prev) => prev.filter((r) => r._id !== id));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Keep a ref so the socket handler always calls the latest backgroundRefresh()
  // without needing to re-register listeners on every render.
  const backgroundRefreshRef = useRef(backgroundRefresh);
  useEffect(() => { backgroundRefreshRef.current = backgroundRefresh; });

  useEffect(() => {
    const socket = getSocket();
    const handle = () => backgroundRefreshRef.current();
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
    <RoomsContext.Provider value={{ rooms, loading, refresh, backgroundRefresh, removeRoom, newRoomIds, itemCounts, dumpsterCount, yardSaleCount, refreshCounts }}>{children}</RoomsContext.Provider>
  );
};

export const useRooms = () => useContext(RoomsContext);

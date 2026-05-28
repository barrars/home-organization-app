import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { notifications } from '@mantine/notifications';
import { getRooms, getItemCountsByRoom, getDumpsterCount, getYardSaleCount } from '../services/api';
import { getSocket } from '../services/socket';
import { getStoredHomes } from './AuthContext';
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

    const eventMessages: Record<string, string> = {
      'item:created': 'A new item was added',
      'item:updated': 'An item was updated',
      'item:deleted': 'An item was trashed',
      'item:restored': 'An item was restored',
      'item:destroyed': 'An item was permanently deleted',
      'room:created': 'A new room was created',
      'room:updated': 'A room was updated',
      'room:deleted': 'A room was trashed',
      'room:restored': 'A room was restored',
      'room:destroyed': 'A room was permanently deleted',
      'dumpster:wiped': 'The trash was emptied',
    };

    const handle = (event: string) => (payload: { homeId?: string }) => {
      const activeId = localStorage.getItem('home_organizer_active_id');
      const isActiveHome = !payload.homeId || !activeId || payload.homeId === activeId;

      if (isActiveHome) {
        backgroundRefreshRef.current();
      } else {
        // Find the source home by its stored id so we can show its name
        const storedHomes = getStoredHomes();
        const sourceHome = storedHomes.find((h) => h.id === payload.homeId);
        const sourceName = sourceHome?.name ?? 'Another household';

        notifications.show({
          title: sourceName,
          message: eventMessages[event] ?? 'Something changed',
          color: 'blue',
          autoClose: 5000,
        });
      }
    };

    const events = Object.keys(eventMessages);
    // Build the handler map once so the same function references are used
    // for both socket.on and socket.off — otherwise cleanup can't deregister them.
    const handlers = Object.fromEntries(events.map((e) => [e, handle(e)]));
    events.forEach((e) => socket.on(e, handlers[e]));
    return () => { events.forEach((e) => socket.off(e, handlers[e])); };
  }, []); // empty — registers once for the lifetime of the provider

  // When the page becomes visible again (e.g. returning from background on mobile),
  // reconnect the socket if needed and do a silent data refresh.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const socket = getSocket();
        if (!socket.connected) socket.connect();
        backgroundRefreshRef.current();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  return (
    <RoomsContext.Provider value={{ rooms, loading, refresh, backgroundRefresh, removeRoom, newRoomIds, itemCounts, dumpsterCount, yardSaleCount, refreshCounts }}>{children}</RoomsContext.Provider>
  );
};

export const useRooms = () => useContext(RoomsContext);

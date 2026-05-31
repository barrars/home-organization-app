import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { getUnreadNotificationCount } from '../services/api';
import { getSocket } from '../services/socket';

interface NotificationsContextType {
  unreadCount: number;
  refreshCount: () => void;
}

const NotificationsContext = createContext<NotificationsContextType>({
  unreadCount: 0,
  refreshCount: () => {},
});

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshCount = useCallback(async () => {
    try {
      const { count } = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch {
      // non-critical
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  // Refresh on any socket event (new activity means new notifications)
  const refreshCountRef = useRef(refreshCount);
  useEffect(() => {
    refreshCountRef.current = refreshCount;
  });

  useEffect(() => {
    const socket = getSocket();
    const events = [
      'item:created',
      'item:updated',
      'item:deleted',
      'item:restored',
      'item:destroyed',
      'room:created',
      'room:updated',
      'room:deleted',
      'room:restored',
      'room:destroyed',
      'dumpster:wiped',
    ];
    const handler = () => {
      refreshCountRef.current();
    };
    events.forEach((e) => socket.on(e, handler));
    return () => {
      events.forEach((e) => socket.off(e, handler));
    };
  }, []);

  // Also refresh when page becomes visible
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshCountRef.current();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return (
    <NotificationsContext.Provider value={{ unreadCount, refreshCount }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationsContext);

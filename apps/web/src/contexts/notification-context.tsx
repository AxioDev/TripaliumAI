'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';
import { socketManager, NotificationPayload } from '@/lib/socket';
import { useNotificationsRealtime, useSocketConnection } from '@/hooks/use-realtime';
import { Notification } from '@/components/notifications/notification-types';

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

const MAX_NOTIFICATIONS = 50;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isConnected } = useSocketConnection();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Convert WebSocket payload to Notification format
  const handleRealtimeNotification = useCallback((payload: NotificationPayload) => {
    const notification: Notification = {
      id: payload.id,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      read: false,
      createdAt: new Date(),
      actionUrl: payload.actionUrl,
      metadata: payload.metadata,
    };

    setNotifications((prev) => {
      // Check if notification already exists
      if (prev.some((n) => n.id === notification.id)) {
        return prev;
      }
      // Add to beginning and limit total
      return [notification, ...prev].slice(0, MAX_NOTIFICATIONS);
    });
  }, []);

  // Subscribe to realtime notifications
  useNotificationsRealtime(handleRealtimeNotification);

  // Add notification manually
  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
      const newNotification: Notification = {
        ...notification,
        id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        read: false,
      };

      setNotifications((prev) => [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS));
    },
    []
  );

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // Clear single notification
  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !n.read).length;

  const value: NotificationContextValue = {
    notifications,
    unreadCount,
    isConnected,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

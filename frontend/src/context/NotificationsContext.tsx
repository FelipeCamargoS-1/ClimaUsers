import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useUsersList } from '../hooks/useUsers';
import { useWeatherQuery } from '../hooks/useWeather';

export type NotificationItem = {
  id: string;
  kind: 'user' | 'weather' | 'system';
  title: string;
  description: string;
  timestamp: string;
  href: string;
};

type NotificationsContextValue = {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  isRead: (id: string) => boolean;
};

const STORAGE_KEY = 'climausers.read-notifications';
const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const usersQuery = useUsersList({ page: 1, limit: 5, sortBy: 'createdAt', sortOrder: 'desc' });
  const weatherQuery = useWeatherQuery({ city: 'Curitiba', stateCode: 'PR', stateName: 'Parana' });
  const [readIds, setReadIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(readIds));
  }, [readIds]);

  const notifications = useMemo<NotificationItem[]>(() => {
    const userNotifications = (usersQuery.data?.data ?? []).map((user) => ({
      id: `user-${user.id}`,
      kind: 'user' as const,
      title: 'Novo usuário cadastrado',
      description: `${user.name} foi adicionado ao sistema.`,
      timestamp: user.createdAt,
      href: '/users',
    }));

    const weatherNotifications = (weatherQuery.data?.alertas ?? []).map((alert, index) => ({
      id: `weather-alert-${index}-${alert}`,
      kind: 'weather' as const,
      title: 'Alerta meteorológico',
      description: alert,
      timestamp: new Date(weatherQuery.dataUpdatedAt || Date.now()).toISOString(),
      href: '/weather',
    }));

    const systemNotifications =
      weatherQuery.isError && weatherQuery.error instanceof Error
        ? [{
            id: 'weather-service-status',
            kind: 'system' as const,
            title: 'Serviço de clima requer atenção',
            description: weatherQuery.error.message,
            timestamp: new Date(weatherQuery.errorUpdatedAt || Date.now()).toISOString(),
            href: '/weather',
          }]
        : [];

    return [...systemNotifications, ...weatherNotifications, ...userNotifications].sort(
      (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
    );
  }, [usersQuery.data?.data, weatherQuery.data?.alertas, weatherQuery.dataUpdatedAt, weatherQuery.error, weatherQuery.errorUpdatedAt, weatherQuery.isError]);

  const unreadCount = notifications.filter((notification) => !readIds.includes(notification.id)).length;

  const value = useMemo<NotificationsContextValue>(() => ({
    notifications,
    unreadCount,
    isLoading: usersQuery.isLoading || weatherQuery.isLoading,
    markAsRead: (id: string) => setReadIds((current) => (current.includes(id) ? current : [...current, id])),
    markAllAsRead: () => setReadIds(notifications.map((notification) => notification.id)),
    isRead: (id: string) => readIds.includes(id),
  }), [notifications, readIds, unreadCount, usersQuery.isLoading, weatherQuery.isLoading]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications deve ser usado dentro de NotificationsProvider');
  return context;
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { alertsApi } from '@/lib/api';
import { useAlertNotifications } from '@/hooks/useAlertNotifications';
import Link from 'next/link';

export function AlertBadge() {
  // Enable real-time alert notifications
  useAlertNotifications();

  const { data: stats } = useQuery({
    queryKey: ['alerts', 'stats'],
    queryFn: alertsApi.getStats,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const activeCount = stats?.active_count || 0;

  return (
    <Link
      href="/alerts"
      className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      title={`${activeCount} alerte(s) active(s)`}
    >
      {/* Bell Icon */}
      <svg
        className={`h-6 w-6 ${
          activeCount > 0
            ? 'text-red-600 dark:text-red-400'
            : 'text-gray-600 dark:text-gray-400'
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>

      {/* Badge Count */}
      {activeCount > 0 && (
        <span
          className={`absolute -top-1 -right-1 flex items-center justify-center h-5 min-w-[20px] px-1 text-xs font-bold rounded-full ${
            activeCount > 9
              ? 'bg-red-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {activeCount > 99 ? '99+' : activeCount}
        </span>
      )}

      {/* Pulsing animation for active alerts */}
      {activeCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        </span>
      )}
    </Link>
  );
}

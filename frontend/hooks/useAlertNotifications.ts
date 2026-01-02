import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/websocket';
import toast from 'react-hot-toast';

interface AlertTriggeredEvent {
  alertId: string;
  sensorId: string;
  tenantId: string;
  co2Level: number;
  severity: 'warning' | 'critical';
  timestamp: string;
}

interface AlertEscalatedEvent {
  alertId: string;
  escalationLevel: number;
  timestamp: string;
}

interface AlertAcknowledgedEvent {
  alertId: string;
  timestamp: string;
}

interface AlertResolvedEvent {
  alertId: string;
  timestamp: string;
}

/**
 * Hook to listen for real-time alert notifications via WebSocket
 * Invalidates alert queries and shows toast notifications
 */
export function useAlertNotifications() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();

    console.log('🚨 useAlertNotifications: Setting up event listeners');

    // Define event handlers
    const handleAlertTriggered = (event: AlertTriggeredEvent) => {
      console.log('🚨 Alert triggered:', event);

      // Show toast notification
      const severity = event.severity === 'critical' ? '🔴' : '⚠️';
      toast.error(`${severity} Alerte CO2: ${event.co2Level} ppm`, {
        duration: 10000,
        position: 'top-right',
        style: {
          background: event.severity === 'critical' ? '#dc2626' : '#ea580c',
          color: '#fff',
          fontWeight: 'bold',
        },
      });

      // Invalidate alert queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alerts', 'stats'] });
    };

    const handleAlertEscalated = (event: AlertEscalatedEvent) => {
      console.log('⚠️ Alert escalated:', event);

      // Show toast notification for escalation
      toast.error(`⚠️ Alerte escaladée (Niveau ${event.escalationLevel})`, {
        duration: 10000,
        position: 'top-right',
        style: {
          background: '#dc2626',
          color: '#fff',
          fontWeight: 'bold',
        },
      });

      // Invalidate alert queries
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alerts', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['alert', event.alertId] });
    };

    const handleAlertAcknowledged = (event: AlertAcknowledgedEvent) => {
      console.log('✅ Alert acknowledged:', event);

      // Invalidate alert queries
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alerts', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['alert', event.alertId] });
    };

    const handleAlertResolved = (event: AlertResolvedEvent) => {
      console.log('✅ Alert resolved:', event);

      // Show success toast
      toast.success('✅ Alerte résolue', {
        duration: 5000,
        position: 'top-right',
      });

      // Invalidate alert queries
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alerts', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['alert', event.alertId] });
    };

    // Register listeners
    const registerListeners = () => {
      console.log('✅ Registering alert event listeners');
      socket.on('alert:triggered', handleAlertTriggered);
      socket.on('alert:escalated', handleAlertEscalated);
      socket.on('alert:acknowledged', handleAlertAcknowledged);
      socket.on('alert:resolved', handleAlertResolved);
    };

    // If already connected, register immediately
    if (socket.connected) {
      registerListeners();
    }

    // Also register on connect event
    socket.on('connect', () => {
      console.log('🔌 Socket connected, registering alert listeners');
      registerListeners();
    });

    // Cleanup on unmount
    return () => {
      console.log('🔌 useAlertNotifications: Cleaning up event listeners');
      socket.off('connect');
      socket.off('alert:triggered', handleAlertTriggered);
      socket.off('alert:escalated', handleAlertEscalated);
      socket.off('alert:acknowledged', handleAlertAcknowledged);
      socket.off('alert:resolved', handleAlertResolved);
    };
  }, [queryClient]);
}

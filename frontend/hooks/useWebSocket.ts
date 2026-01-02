import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/websocket';

interface SensorReadingsUpdateEvent {
  sensorId: string;
  timestamp: string;
  data?: {
    co2: number;
    temperature: number | null;
    humidity: number | null;
    timestamp: Date;
  };
}

interface SyncCompletedEvent {
  tenantId: string;
  timestamp: string;
  stats?: {
    devicesCount: number;
  };
}

interface SensorUpdateEvent {
  sensorId: string;
  timestamp: string;
  data?: any;
}

export function useWebSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();

    console.log('🔌 useWebSocket: Setting up event listeners');
    console.log('🔌 Socket connected:', socket.connected);
    console.log('🔌 Socket ID:', socket.id);

    // Define event handlers
    const handleSensorReadingsUpdate = (event: SensorReadingsUpdateEvent) => {
      console.log('📡 Sensor readings update received:', event);

      // Invalidate queries for this specific sensor
      queryClient.invalidateQueries({
        queryKey: ['sensor-readings', event.sensorId]
      });

      // Also invalidate the sensor details
      queryClient.invalidateQueries({
        queryKey: ['sensor', event.sensorId]
      });
    };

    const handleSyncCompleted = (event: SyncCompletedEvent) => {
      console.log('🔄 Sync completed:', event);

      // Invalidate all sensor-related queries
      queryClient.invalidateQueries({
        queryKey: ['sensors']
      });

      queryClient.invalidateQueries({
        queryKey: ['sensor-readings']
      });
    };

    const handleSensorUpdate = (event: SensorUpdateEvent) => {
      console.log('🔔 Sensor update received:', event);

      queryClient.invalidateQueries({
        queryKey: ['sensor', event.sensorId]
      });
    };

    // Catch-all event listener for debugging
    const handleAnyEvent = (eventName: string, ...args: any[]) => {
      console.log('🌐 ANY EVENT RECEIVED:', eventName, args);
    };

    // Register listeners
    const registerListeners = () => {
      console.log('✅ Registering event listeners on connected socket');
      socket.onAny(handleAnyEvent);
      socket.on('sensor:readings:update', handleSensorReadingsUpdate);
      socket.on('sync:completed', handleSyncCompleted);
      socket.on('sensor:update', handleSensorUpdate);
    };

    // If already connected, register immediately
    if (socket.connected) {
      registerListeners();
    }

    // Also register on connect event (for initial connection or reconnection)
    socket.on('connect', () => {
      console.log('🔌 Socket connected event fired, registering listeners');
      registerListeners();
    });

    // Cleanup on unmount
    return () => {
      console.log('🔌 useWebSocket: Cleaning up event listeners');
      // Only remove our specific listeners, not all listeners
      socket.off('connect');
      socket.off('sensor:readings:update', handleSensorReadingsUpdate);
      socket.off('sync:completed', handleSyncCompleted);
      socket.off('sensor:update', handleSensorUpdate);
      socket.offAny(handleAnyEvent);
    };
  }, [queryClient]);
}

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

    // Listen for sensor readings updates
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

    // Listen for sync completed events
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

    // Listen for general sensor updates
    const handleSensorUpdate = (event: SensorUpdateEvent) => {
      console.log('🔔 Sensor update received:', event);

      queryClient.invalidateQueries({
        queryKey: ['sensor', event.sensorId]
      });
    };

    // Register event listeners
    socket.on('sensor:readings:update', handleSensorReadingsUpdate);
    socket.on('sync:completed', handleSyncCompleted);
    socket.on('sensor:update', handleSensorUpdate);

    // Cleanup on unmount
    return () => {
      socket.off('sensor:readings:update', handleSensorReadingsUpdate);
      socket.off('sync:completed', handleSyncCompleted);
      socket.off('sensor:update', handleSensorUpdate);
    };
  }, [queryClient]);
}

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: '/',
  cors: {
    origin: ['http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
  },
  path: '/socket.io/',
})
export class SyncGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SyncGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Emit sensor readings update event to all connected clients
   */
  emitSensorReadingsUpdate(sensorId: string, data?: any) {
    this.logger.log(`Emitting sensor readings update for sensor ${sensorId}`);
    this.server.emit('sensor:readings:update', {
      sensorId,
      timestamp: new Date().toISOString(),
      data,
    });
  }

  /**
   * Emit sync completed event to all connected clients
   */
  emitSyncCompleted(tenantId: string, stats?: any) {
    this.logger.log(`Emitting sync completed for tenant ${tenantId}`);
    this.server.emit('sync:completed', {
      tenantId,
      timestamp: new Date().toISOString(),
      stats,
    });
  }

  /**
   * Emit sensor update event for a specific sensor
   */
  emitSensorUpdate(sensorId: string, data?: any) {
    this.logger.log(`Emitting sensor update for sensor ${sensorId}`);
    this.server.emit('sensor:update', {
      sensorId,
      timestamp: new Date().toISOString(),
      data,
    });
  }
}

import { Module } from '@nestjs/common';
import { SyncGateway } from './websocket.gateway';

@Module({
  providers: [SyncGateway],
  exports: [SyncGateway],
})
export class WebsocketModule {}

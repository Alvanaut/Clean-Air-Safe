import { Module, Global } from '@nestjs/common';
import { KspAuthService } from './ksp-auth.service';
import { KspService } from './ksp.service';
import { KspTestController } from './ksp-test.controller';

@Global()
@Module({
  controllers: [KspTestController],
  providers: [KspAuthService, KspService],
  exports: [KspService],
})
export class KspModule {}

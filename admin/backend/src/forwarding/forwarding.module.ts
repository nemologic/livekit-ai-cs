import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ForwardingController } from './forwarding.controller';
import { ForwardingService } from './forwarding.service';
import { ForwardingSetting } from './forwarding-setting.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([ForwardingSetting]), AuthModule],
  controllers: [ForwardingController],
  providers: [ForwardingService],
})
export class ForwardingModule {}

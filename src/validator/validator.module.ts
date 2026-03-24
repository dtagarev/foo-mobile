import { Module } from '@nestjs/common';
import { ValidatorController } from './validator.controller';
import { ValidatorService } from './validator.service';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Ip } from './entities/ip.entity';
import { HttpModule } from '@nestjs/axios';
import { ValidationRequestSender } from './requests/validation.request.sender';
import { Phone } from './entities/phone.entity';
import { SmsService } from '../sms/sms.service';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ip, Phone]),
    HttpModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 5,
      },
    ]),
  ],
  controllers: [ValidatorController],
  providers: [ValidatorService, ValidationRequestSender, SmsService],
})
export class ValidatorModule {}

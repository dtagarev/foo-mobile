import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ValidatorModule } from './validator/validator.module';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Ip } from './validator/entities/ip.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';
import { Phone } from './validator/entities/phone.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('POSTGRES_HOST'),
        port: config.get('POSTGRES_PORT'),
        username: config.get('POSTGRES_USER'),
        password: config.get('POSTGRES_PASS'),
        database: config.get('POSTGRES_DATABASE'),
        entities: [Ip, Phone],
        // synchronize: true,
      }),
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        return {
          stores: [
            new KeyvRedis(
              `redis://${configService.get('REDIS_HOST')}:${configService.get('REDIS_PORT')}`,
            ),
          ],
        };
      },
      inject: [ConfigService],
      isGlobal: true,
    }),
    ValidatorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

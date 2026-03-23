import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cache, CACHE_MANAGER, CacheModule } from '@nestjs/cache-manager';
import { ValidatorModule } from '../../src/validator/validator.module';
import { DataSource } from 'typeorm';
import KeyvRedis from '@keyv/redis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  ipFraudScoreKey,
  phoneFraudScoreKey,
} from '../../src/redis/redis.keys';
import * as express from 'express';
import { setFips } from 'crypto';
import { ThrottlerStorage } from '@nestjs/throttler';

describe('Validator controller (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  let cacheManager: Cache;
  
  let throttlerStorage: ThrottlerStorage;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
          isGlobal: true,
        }),
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
            autoLoadEntities: true,
            synchronize: true,
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
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // get the raw Express instance
    const expressApp = app.getHttpAdapter().getInstance() as express.Express;

    //needed to test the rate limit per IP by giving different ips
    expressApp.set('trust proxy', 1);

    dataSource = await app.get(DataSource);
    
    

    cacheManager = await app.get<Cache>(CACHE_MANAGER);

    throttlerStorage = app.get(ThrottlerStorage);
  });

  afterAll(async () => {
    await dataSource.destroy();
    for (const store of cacheManager.stores) {
      await store.disconnect();
    }
    await cacheManager.disconnect();
    await app.close();
  });

  afterEach(async () => {
    // Clear all tables between tests
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repo = dataSource.getRepository(entity.name);
      await repo.clear();
    }

    for (const store of cacheManager.stores) {
      await store.clear();
    }
    
    throttlerStorage['storage'].clear(); 
  });

  describe('Validate ip api', () => {
    it('/validate/phone (POST) return correct data', async () => {
      let myIp: string = '46.232.134.138';

      await request(app.getHttpServer())
        .post('/validate/ip')
        .send({ ip: myIp })
        .set('Accept', 'application/json')
        .expect(201)
        .expect('{"fraudPercentage":0}');

      const repo = await dataSource.getRepository('Ip');
      expect(await repo.findOne({ where: { ip: myIp } })).not.toBeNull();

      const cachedValue = await cacheManager.get(ipFraudScoreKey(myIp));
      expect(cachedValue).toBe(0);
    });

    it('/validate/phone (POST) with untrimmed input', async () => {
      await request(app.getHttpServer())
        .post('/validate/ip')
        .send({ ip: '   46.232.134.138   ' })
        .set('Accept', 'application/json')
        .expect(201)
        .expect('{"fraudPercentage":0}');
    });

    it('/validate/phone (POST) invalid ip', async () => {
      await request(app.getHttpServer())
        .post('/validate/ip')
        .send({ ip: '1234' })
        .set('Accept', 'application/json')
        .expect(400)
        .expect(
          '{"message":["ip must be an ip address"],"error":"Bad Request","statusCode":400}',
        );
    });
  });

  describe('verify phone api', () => {
    it('/validate/phone (POST) return correct data', async () => {
      let myPhone: string = '+359 878 168 609';

      
      await request(app.getHttpServer())
        .post('/validate/phone')
        .send({ phone: myPhone })
        .set('Accept', 'application/json')
        .expect(201)
        .expect('{"fraudPercentage":0}');

      const repo = await dataSource.getRepository('Phone');
      expect(await repo.findOne({ where: { phone: myPhone } })).not.toBeNull();

      const cachedValue = await cacheManager.get(phoneFraudScoreKey(myPhone));
      expect(cachedValue).toBe(0);
    });

    it('/validate/phone (POST) with untrimmed input', async () => {
      await request(app.getHttpServer())
        .post('/validate/phone')
        .send({ phone: '   +359888123456   ' })
        .set('Accept', 'application/json')
        .expect(201)
        .expect('{"fraudPercentage":78}');
    });

    //should see if the api returns erorr if sms is not send but could not be testest because of the hardcoded number for sms
    // it('/validate/phone (POST) with error while sending sms', async () => {});

    it('/validate/phone (POST) invalid phone', async () => {
      await request(app.getHttpServer())
        .post('/validate/phone')
        .send({ ip: '1234' })
        .set('Accept', 'application/json')
        .expect(400)
        .expect(
          '{"message":["phone must be a valid phone number"],"error":"Bad Request","statusCode":400}',
        );
    });

    describe('/validate/phone rate limiting ', () => {
      it('should rate limit after 5 requests', async () => {
        const requestAgent = request(app.getHttpServer());

        for (let i = 0; i < 5; i++) {
          await requestAgent
            .post('/validate/phone')
            .send({ phone: '+359888123456' })
            .set('Accept', 'application/json')
            .expect(201);
        }

        // the 6th request should fail
        await requestAgent
          .post('/validate/phone')
          .send({ phone: '+359888123456' })
          .expect(429)
          .expect(
            '{"statusCode":429,"message":"ThrottlerException: Too Many Requests"}',
          );
      });

      it('should rate limit per IP', async () => {
        const requestAgent = request(app.getHttpServer());

        // hit limit on 1st ip
        for (let i = 0; i < 5; i++) {
          await requestAgent
            .post('/validate/phone')
            .set('X-Forwarded-For', '1.1.1.1')
            .send({ phone: '+359888123456' })
            .expect(201);
        }

        await requestAgent
          .post('/validate/phone')
          .set('X-Forwarded-For', '1.1.1.1')
          .send({ phone: '+359888123456' })
          .expect(429);

        // request still allowed on ip 2
        await requestAgent
          .post('/validate/phone')
          .set('X-Forwarded-For', '2.2.2.2')
          .send({ phone: '+359888123456' })
          .expect(201);
      });
    });
  });
});

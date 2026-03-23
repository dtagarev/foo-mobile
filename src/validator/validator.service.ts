import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Ip } from './entities/ip.entity';
import { ipFraudScoreKey, phoneFraudScoreKey } from '../redis/redis.keys';
import {
  IpRequestInfo,
  PhoneRequestInfo,
  ValidationRequestSender,
} from './requests/validation.request.sender';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Phone } from './entities/phone.entity';
import { SmsService } from '../sms/sms.service';

@Injectable()
export class ValidatorService {
  constructor(
    @InjectRepository(Ip)
    private ipRepository: Repository<Ip>,
    @InjectRepository(Phone)
    private phoneRepository: Repository<Phone>,
    private requestSender: ValidationRequestSender,
    private smsService: SmsService,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  private setIpInCache(ip: string, fraudScore: number) {
    //ttl - 5 minutes in milliseconds
    this.cacheManager.set(ipFraudScoreKey(ip), fraudScore, 300_000);
  }

  private setPhoneInCache(phone: string, fraudScore: number) {
    //ttl - 5 minutes in milliseconds
    this.cacheManager.set(phoneFraudScoreKey(phone), fraudScore, 300_000);
  }

  private async sendSmsIfValidPhone(
    phone: string,
    fraudScore: number,
    message: string = 'hello, is it me you are looking for?',
  ) {
    if (fraudScore === 0) {
      console.log('Sending SMS message!');
      await this.smsService.sendMessage(phone, message);
    }
  }

  async validateIp(ip: string) {
    // check the redis for already stored ips
    const cachedResult = (await this.cacheManager.get(
      ipFraudScoreKey(ip),
    )) as number;

    if (cachedResult !== undefined && cachedResult !== null) {
      return +cachedResult;
    }

    // check the database for already stored ips
    const storedIp: Ip | null = await this.ipRepository.findOneBy({ ip });

    if (storedIp !== null && storedIp.fraudScore !== -1) {
      this.setIpInCache(ip, storedIp.fraudScore);
      return storedIp.fraudScore;
    }

    //verify the ip
    const res: IpRequestInfo = await this.requestSender.verifyIp(ip);
    if (res.success === false || res.fraudScore === undefined) {
      throw Error(`Error verifying ip: ${ip}`);
    }

    //store in the database and in cache, with retencion 5 mins
    await this.setIpInCache(ip, res.fraudScore);

    const ipEntity = await this.ipRepository.create({
      ip: ip,
      fraudScore: res.fraudScore,
    });
    await this.ipRepository.save(ipEntity);

    return res.fraudScore;
  }

  async validatePhone(phone: string): Promise<number> {
    // check the redis for already stored phones
    const cachedResult: number = (await this.cacheManager.get(
      phoneFraudScoreKey(phone),
    )) as number;

    if (cachedResult !== undefined && cachedResult !== null) {
      const cachedResNum = +cachedResult;
      this.sendSmsIfValidPhone(phone, cachedResNum);
      return cachedResNum;
    }

    // check the database for already stored phone
    const storedPhone: Phone | null = await this.phoneRepository.findOneBy({
      phone,
    });

    if (storedPhone !== null && storedPhone.fraudScore !== -1) {
      this.setPhoneInCache(phone, storedPhone.fraudScore);
      this.sendSmsIfValidPhone(phone, storedPhone.fraudScore);
      return storedPhone.fraudScore;
    }

    //verify phone number
    const res: PhoneRequestInfo = await this.requestSender.verifyPhone(phone);

    if (
      res.success === false ||
      res.valid === false ||
      res.fraudScore === undefined
    ) {
      throw Error(`Error verifying phone: ${phone}`);
    }

    //store in the database and in cache, with retencion 5 mins
    await this.setPhoneInCache(phone, res.fraudScore);

    const phoneEntity = await this.phoneRepository.create({
      phone: phone,
      fraudScore: res.fraudScore,
    });
    await this.phoneRepository.save(phoneEntity);

    this.sendSmsIfValidPhone(phone, res.fraudScore);
    return res.fraudScore;
  }
}

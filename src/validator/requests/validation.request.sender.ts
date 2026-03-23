import { HttpService } from '@nestjs/axios';
import { firstValueFrom, map } from 'rxjs';

import { UrlGenerator } from './url.generator';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type IpRequestInfo = {
  success: boolean;
  fraudScore: number | undefined;
};

export type PhoneRequestInfo = {
  success: boolean;
  valid: boolean;
  fraudScore: number;
};

@Injectable()
export class ValidationRequestSender {
  constructor(
    private readonly httpService: HttpService,
    private configService: ConfigService,
  ) {}

  async verifyIp(ip: string): Promise<IpRequestInfo> {
    const requestUrl: string = UrlGenerator.getUrlForIp(
      this.configService.get('IPQS_API_TOKEN'),
      ip,
    );

    const responce = await firstValueFrom(
      this.httpService.get(requestUrl).pipe(map((res) => res.data)),
    );

    return {
      success: responce.success,
      fraudScore: responce.fraud_score,
    } as IpRequestInfo;
  }

  async verifyPhone(phone: string) {
    const requestUrl: string = UrlGenerator.getUrlForPhone(
      this.configService.get('IPQS_API_TOKEN'),
      phone,
    );

    const httpServiceResponce = this.httpService.get(requestUrl);

    const responce = await firstValueFrom(
      httpServiceResponce.pipe(map((res) => res.data)),
    );

    return {
      success: responce.success,
      valid: responce.valid,
      fraudScore: responce.fraud_score,
    } as PhoneRequestInfo;
  }
}

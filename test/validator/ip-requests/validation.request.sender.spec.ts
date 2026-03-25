import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { of } from 'rxjs';
import { AutoMocker } from 'automocker';

import { ValidationRequestSender } from '../../../src/validator/requests/validation.request.sender';
import { ConfigService } from '@nestjs/config';

describe('IpValidationRequest', () => {
  let requestSender: ValidationRequestSender;

  let mocker = AutoMocker.createJestMocker(jest);

  let mockHttpService;
  let mockConfigService;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockHttpService = mocker.createMockInstance(HttpService);
    mockConfigService = mocker.createMockInstance(ConfigService);

    mockConfigService.get.mockReturnValue('irelevant');

    requestSender = new ValidationRequestSender(
      mockHttpService,
      mockConfigService,
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should work', async () => {
    //fraud_score is the syntax in the actual responce from axious
    const axiosResponse: AxiosResponse = {
      data: { success: true, fraud_score: 42 },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { headers: undefined },
    };
    mockHttpService.get.mockReturnValue(of(axiosResponse));

    let res = await requestSender.verifyIp('irelevant');

    expect(res.fraudScore).toBe(42);
  });
});

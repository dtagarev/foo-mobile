import { Test, TestingModule } from '@nestjs/testing';

//Mocking twilio constructor before the SmsService is initialized
const mockTwilioCreateMessage = jest
  .fn()
  .mockResolvedValue({ sid: 'SM12345', status: 'sent' });
jest.mock('twilio', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: mockTwilioCreateMessage,
    },
  }));
});

import { SmsService } from '../../src/sms/sms.service';
import { ConfigService } from '@nestjs/config';

describe('SmsService', () => {
  let service: SmsService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'TWILIO_ACCOUNT_SID':
          return 'fakeSid';
        case 'TWILIO_AUTH_TOKEN':
          return 'fakeToken';
        case 'TWILIO_PHONE':
          return '+1234567890';
        default:
          return null;
      }
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SmsService>(SmsService);
  });

  it('should call Twilio messages.create', async () => {
    const to = '+359888123456';
    const body = 'Test message';

    await service.sendMessage(to, body);

    expect(mockTwilioCreateMessage).toHaveBeenCalled();
  });
});

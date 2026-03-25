import { ValidatorService } from '../../src/validator/validator.service';
import { AutoMocker } from 'automocker';
import { Repository } from 'typeorm';
import { Ip } from '../../src/validator/entities/ip.entity';
import {
  IpRequestInfo,
  PhoneRequestInfo,
  ValidationRequestSender,
} from '../../src/validator/requests/validation.request.sender';
import {
  ipFraudScoreKey,
  phoneFraudScoreKey,
} from '../../src/redis/redis.keys';
import { Cache } from '@nestjs/cache-manager';
import { Keyv } from '@keyv/redis';
import { Phone } from '../../src/validator/entities/phone.entity';
import { SmsService } from '../../src/sms/sms.service';
import { mock } from 'node:test';

describe('ValidatorService', () => {
  let service: ValidatorService;

  let mocker = AutoMocker.createJestMocker(jest);

  let mockIpRepository;
  let mockPhoneRepository;
  let mockValidationRequestSender;
  let mockSmsService;

  let mockCache: Cache = {
    async get<T>(key: string): Promise<T> {
      const value = 10;
      return value as T;
    },

    async set<T>(key: string, value: T, ttl: number): Promise<T> {
      return null;
    },

    mget: () => {
      return null;
    },
    ttl: () => {
      return null;
    },
    mset: () => {
      return null;
    },
    del: () => {
      return null;
    },
    mdel: () => {
      return null;
    },
    clear: () => {
      return null;
    },
    on: () => {
      return null;
    },
    off: () => {
      return null;
    },
    disconnect: () => {
      return null;
    },
    cacheId: () => {
      return null;
    },
    stores: [new Keyv()],
    wrap: () => {
      return null;
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockIpRepository = mocker.createMockInstance(Repository<Ip>);
    mockPhoneRepository = mocker.createMockInstance(Repository<Phone>);
    mockValidationRequestSender = mocker.createMockInstance(
      ValidationRequestSender,
    );
    mockSmsService = mocker.createMockInstance(SmsService);

    service = new ValidatorService(
      mockIpRepository,
      mockPhoneRepository,
      mockValidationRequestSender,
      mockSmsService,
      mockCache,
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
    service = null;
  });

  describe('ValidateIp tests', () => {
    it('should return IP failPersentage data from request, and store it in datastore and cache', async () => {
      mockCache.get = () => {
        return null;
      };
      let isStoredInCache: boolean = false;
      mockCache.set = (key, value, ttl) => {
        isStoredInCache = true;
        return null;
      };
      mockIpRepository.findOneBy.mockReturnValue(null);
      mockValidationRequestSender.verifyIp.mockReturnValue({
        success: true,
        fraudScore: 10,
      } as IpRequestInfo);

      let repoStoredObject = { ip: '123', fraudScore: 10 };

      let fraudScore = await service.validateIp('123');

      expect(fraudScore).toBe(10);
      expect(mockIpRepository.create).toHaveBeenCalledWith(repoStoredObject);
      expect(isStoredInCache).toBe(true);
    });

    it('should return the IP failPersentage from the cache', async () => {
      mockCache.get = async <T>(key: string): Promise<T> => {
        return 11 as T;
      };

      let fraudScore = await service.validateIp('123');

      expect(fraudScore).toBe(11);
      //not taken from storage
      expect(mockIpRepository.findOneBy).toHaveBeenCalledTimes(0);
      //not taken from request
      expect(mockValidationRequestSender.verifyIp).toHaveBeenCalledTimes(0);
    });

    it('should store every Ip in cache with unique key', async () => {
      //return from request.
      mockCache.get = () => {
        return null;
      };
      let storedKeysInCache: string[] = [];
      mockCache.set = (key, value, ttl) => {
        storedKeysInCache.push(key);
        return null;
      };
      mockIpRepository.findOneBy.mockReturnValue(null);
      mockValidationRequestSender.verifyIp.mockReturnValue({
        success: true,
        fraudScore: 10,
      } as IpRequestInfo);

      let fraudScore = await service.validateIp('123');

      mockValidationRequestSender.verifyIp.mockReturnValue({
        success: true,
        fraudScore: 15,
      } as IpRequestInfo);

      let fraudScore2 = await service.validateIp('456');

      let expectedKeysFromCache = [
        ipFraudScoreKey('123'),
        ipFraudScoreKey('456'),
      ];

      expect(fraudScore).not.toEqual(fraudScore2);
      expect(expectedKeysFromCache).toEqual(storedKeysInCache);
    });

    it('should return the IP failPersentage from the database and store it in the cache for later', async () => {
      mockCache.get = () => {
        return null;
      };
      mockValidationRequestSender.verifyIp.mockReturnValue(null);

      let isStoredInCache: boolean = false;
      mockCache.set = (key, value, ttl) => {
        isStoredInCache = true;
        return null;
      };

      mockIpRepository.findOneBy.mockReturnValue({
        id: 1,
        ip: '123',
        fraudScore: 12,
      } as Ip);

      let fraudScore = await service.validateIp('123');

      expect(fraudScore).toBe(12);
      expect(isStoredInCache).toBe(true);
    });

    it('should not return -1 for IP if getting from the database, and shoud store the new value', async () => {
      mockCache.get = () => {
        return null;
      };
      mockIpRepository.findOneBy.mockReturnValue({
        id: 1,
        ip: '123',
        fraudScore: -1,
      } as Ip);
      mockValidationRequestSender.verifyIp.mockReturnValue({
        success: true,
        fraudScore: 10,
      } as IpRequestInfo);
      let repoStoredObject = { ip: '123', fraudScore: 10 };

      let fraudScore = await service.validateIp('123');

      expect(fraudScore).toBe(10);
      expect(mockIpRepository.findOneBy).toHaveBeenCalled();
      expect(mockIpRepository.create).toHaveBeenCalledWith(repoStoredObject);
    });

    it('should not return null for IP if getting from the database, and shoud store the new value', async () => {
      mockCache.get = () => {
        return null;
      };
      mockIpRepository.findOneBy.mockReturnValue(null as Ip);
      mockValidationRequestSender.verifyIp.mockReturnValue({
        success: true,
        fraudScore: 10,
      } as IpRequestInfo);
      let repoStoredObject = { ip: '123', fraudScore: 10 };

      let fraudScore = await service.validateIp('123');

      expect(fraudScore).toBe(10);
      expect(mockIpRepository.findOneBy).toHaveBeenCalled();
      expect(mockIpRepository.create).toHaveBeenCalledWith(repoStoredObject);
    });

    it('should throw error if IP request is unsuccessful', async () => {
      mockCache.get = () => {
        return null;
      };
      mockIpRepository.findOneBy.mockReturnValue(null);
      mockValidationRequestSender.verifyIp.mockReturnValue({
        success: false,
        fraudScore: 10,
      } as IpRequestInfo);

      await expect(service.validateIp('123')).rejects.toThrow(
        'Error verifying ip: 123',
      );
    });

    it('should throw error if IP request is undefined', async () => {
      mockCache.get = () => {
        return null;
      };
      mockIpRepository.findOneBy.mockReturnValue(null);
      mockValidationRequestSender.verifyIp.mockReturnValue({
        success: true,
        fraudScore: undefined,
      } as IpRequestInfo);

      await expect(service.validateIp('123')).rejects.toThrow(
        'Error verifying ip: 123',
      );
    });
  });

  describe('ValidatePhone tests', () => {
    it('should return Phone failPersentage data from request, and store it in datastore and cache', async () => {
      mockCache.get = () => {
        return null;
      };
      let isStoredInCache: boolean = false;
      mockCache.set = (key, value, ttl) => {
        isStoredInCache = true;
        return null;
      };
      mockPhoneRepository.findOneBy.mockReturnValue(null);
      mockValidationRequestSender.verifyPhone.mockReturnValue({
        success: true,
        valid: true,
        fraudScore: 10,
      } as PhoneRequestInfo);

      let repoStoredObject = { phone: '123', fraudScore: 10 };

      let fraudScore = await service.validatePhone('123');

      expect(fraudScore).toBe(10);
      expect(mockPhoneRepository.create).toHaveBeenCalledWith(repoStoredObject);
      expect(isStoredInCache).toBe(true);
    });

    it('should return the Phone failPersentage from the cache', async () => {
      mockCache.get = async <T>(key: string): Promise<T> => {
        return 11 as T;
      };

      let fraudScore = await service.validatePhone('123');

      expect(fraudScore).toBe(11);
      //not taken from storage
      expect(mockPhoneRepository.findOneBy).toHaveBeenCalledTimes(0);
      //not taken from request
      expect(mockValidationRequestSender.verifyPhone).toHaveBeenCalledTimes(0);
    });

    it('should store every Phone in cache with unique key', async () => {
      //return from request.
      mockCache.get = () => {
        return null;
      };
      let storedKeysInCache: string[] = [];
      mockCache.set = (key, value, ttl) => {
        storedKeysInCache.push(key);
        return null;
      };
      mockPhoneRepository.findOneBy.mockReturnValue(null);
      mockValidationRequestSender.verifyPhone.mockReturnValue({
        success: true,
        valid: true,
        fraudScore: 10,
      } as PhoneRequestInfo);

      let fraudScore = await service.validatePhone('123');

      mockValidationRequestSender.verifyPhone.mockReturnValue({
        success: true,
        valid: true,
        fraudScore: 15,
      } as PhoneRequestInfo);

      let fraudScore2 = await service.validatePhone('456');

      let expectedKeysFromCache = [
        phoneFraudScoreKey('123'),
        phoneFraudScoreKey('456'),
      ];

      expect(fraudScore).not.toEqual(fraudScore2);
      expect(expectedKeysFromCache).toEqual(storedKeysInCache);
    });

    it('should return the Phone failPersentage from the database and store it in the cache for later', async () => {
      mockCache.get = () => {
        return null;
      };
      mockValidationRequestSender.verifyPhone.mockReturnValue(null);

      let isStoredInCache: boolean = false;
      mockCache.set = (key, value, ttl) => {
        isStoredInCache = true;
        return null;
      };

      mockPhoneRepository.findOneBy.mockReturnValue({
        id: 1,
        phone: '123',
        fraudScore: 12,
      } as Phone);

      let fraudScore = await service.validatePhone('123');

      expect(fraudScore).toBe(12);
      expect(isStoredInCache).toBe(true);
    });

    it('should not return -1 for phone if getting from the database, and shoud store the new value', async () => {
      mockCache.get = () => {
        return null;
      };
      mockPhoneRepository.findOneBy.mockReturnValue({
        id: 1,
        phone: '123',
        fraudScore: -1,
      } as Phone);
      mockValidationRequestSender.verifyPhone.mockReturnValue({
        success: true,
        valid: true,
        fraudScore: 10,
      } as PhoneRequestInfo);
      let repoStoredObject = { phone: '123', fraudScore: 10 };

      let fraudScore = await service.validatePhone('123');

      expect(fraudScore).toBe(10);
      expect(mockPhoneRepository.findOneBy).toHaveBeenCalled();
      expect(mockPhoneRepository.create).toHaveBeenCalledWith(repoStoredObject);
    });

    it('should not return null for Phone if getting from the database, and shoud store the new value', async () => {
      mockCache.get = () => {
        return null;
      };
      mockPhoneRepository.findOneBy.mockReturnValue(null as Phone);
      mockValidationRequestSender.verifyPhone.mockReturnValue({
        success: true,
        valid: true,
        fraudScore: 10,
      } as PhoneRequestInfo);
      let repoStoredObject = { phone: '123', fraudScore: 10 };

      let fraudScore = await service.validatePhone('123');

      expect(fraudScore).toBe(10);
      expect(mockPhoneRepository.findOneBy).toHaveBeenCalled();
      expect(mockPhoneRepository.create).toHaveBeenCalledWith(repoStoredObject);
    });

    it('should throw error if Phone request is unsuccessful', async () => {
      mockCache.get = () => {
        return null;
      };
      mockPhoneRepository.findOneBy.mockReturnValue(null);
      mockValidationRequestSender.verifyPhone.mockReturnValue({
        success: false,
        valid: true,
        fraudScore: 10,
      } as PhoneRequestInfo);

      await expect(service.validatePhone('123')).rejects.toThrow(
        'Error verifying phone: 123',
      );
    });

    it('should throw error if Phone request is invalid', async () => {
      mockCache.get = () => {
        return null;
      };
      mockPhoneRepository.findOneBy.mockReturnValue(null);
      mockValidationRequestSender.verifyPhone.mockReturnValue({
        success: true,
        valid: false,
        fraudScore: 10,
      } as PhoneRequestInfo);

      await expect(service.validatePhone('123')).rejects.toThrow(
        'Error verifying phone: 123',
      );
    });

    it('should throw error if Phone request is undefined', async () => {
      mockCache.get = () => {
        return null;
      };
      mockPhoneRepository.findOneBy.mockReturnValue(null);
      mockValidationRequestSender.verifyPhone.mockReturnValue({
        success: true,
        valid: true,
        fraudScore: undefined,
      } as PhoneRequestInfo);

      await expect(service.validatePhone('123')).rejects.toThrow(
        'Error verifying phone: 123',
      );
    });

    describe('Sending sms tests ', () => {
      it('should send sms to not malitious phones when failPersentage received from request', async () => {
        mockCache.get = () => {
          return null;
        };
        mockCache.set = (key, value, ttl) => {
          return null;
        };
        mockPhoneRepository.findOneBy.mockReturnValue(null);
        mockValidationRequestSender.verifyPhone.mockReturnValue({
          success: true,
          valid: true,
          fraudScore: 0,
        } as PhoneRequestInfo);

        let fraudScore = await service.validatePhone('123');

        expect(fraudScore).toBe(0);
        expect(mockSmsService.sendMessage).toHaveBeenCalled();
      });

      it('should NOT send sms to not malitious phones when failPersentage > 0 and received from request', async () => {
        mockCache.get = () => {
          return null;
        };
        mockCache.set = (key, value, ttl) => {
          return null;
        };
        mockPhoneRepository.findOneBy.mockReturnValue(null);
        mockValidationRequestSender.verifyPhone.mockReturnValue({
          success: true,
          valid: true,
          fraudScore: 10,
        } as PhoneRequestInfo);

        let fraudScore = await service.validatePhone('123');

        expect(fraudScore).toBe(10);
        expect(mockSmsService.sendMessage).not.toHaveBeenCalled();
      });

      it('should send sms to not malitious phones when failPersentage received from the cache', async () => {
        mockCache.get = async <T>(key: string): Promise<T> => {
          return 0 as T;
        };

        let fraudScore = await service.validatePhone('123');

        expect(fraudScore).toBe(0);
        //not taken from storage
        expect(mockPhoneRepository.findOneBy).toHaveBeenCalledTimes(0);
        //not taken from request
        expect(mockValidationRequestSender.verifyPhone).toHaveBeenCalledTimes(
          0,
        );

        expect(mockSmsService.sendMessage).toHaveBeenCalled();
      });

      it('should NOT send sms to not malitious phones when failPersentage > 0 and received from the cache', async () => {
        mockCache.get = async <T>(key: string): Promise<T> => {
          return 11 as T;
        };

        let fraudScore = await service.validatePhone('123');

        expect(fraudScore).toBe(11);
        //not taken from storage
        expect(mockPhoneRepository.findOneBy).toHaveBeenCalledTimes(0);
        //not taken from request
        expect(mockValidationRequestSender.verifyPhone).toHaveBeenCalledTimes(
          0,
        );

        expect(mockSmsService.sendMessage).not.toHaveBeenCalled();
      });

      it('should send sms to not malitious phones when failPersentage received from the database', async () => {
        mockCache.get = () => {
          return null;
        };
        mockValidationRequestSender.verifyPhone.mockReturnValue(null);

        mockPhoneRepository.findOneBy.mockReturnValue({
          id: 1,
          phone: '123',
          fraudScore: 0,
        } as Phone);

        let fraudScore = await service.validatePhone('123');

        expect(fraudScore).toBe(0);
        expect(mockSmsService.sendMessage).toHaveBeenCalled();
      });

      it('should NOT send sms to not malitious phones when failPersentage > 0 and received from the database', async () => {
        mockCache.get = () => {
          return null;
        };
        mockValidationRequestSender.verifyPhone.mockReturnValue(null);

        mockPhoneRepository.findOneBy.mockReturnValue({
          id: 1,
          phone: '123',
          fraudScore: 12,
        } as Phone);

        let fraudScore = await service.validatePhone('123');

        expect(fraudScore).toBe(12);
        expect(mockSmsService.sendMessage).not.toHaveBeenCalled();
      });
    });
  });
});

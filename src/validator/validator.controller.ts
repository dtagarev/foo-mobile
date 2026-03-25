import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { ValidatorService } from './validator.service';
import { ValidateIpDto } from './dtos/validate.ip.dto';
import { IpResponceDto } from './dtos/ip.response.dto';
import { ValidatePhoneDto } from './dtos/validate.phone.dto';
import { PhoneResponceDto } from './dtos/phone.response.dto';
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('validate')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
  }),
)
export class ValidatorController {
  constructor(private ipService: ValidatorService) {}

  @Post('ip')
  async validateIp(@Body() dto: ValidateIpDto): Promise<IpResponceDto> {
    try {
      const fraudScore = await this.ipService.validateIp(dto.ip);

      return {
        fraudPercentage: fraudScore,
      };
    } catch (err) {
      return {
        fraudPercentage: -1,
        error: `Error validating Ip: ${err}`,
      };
    }
  }

  @Post('phone')
  @UseGuards(ThrottlerGuard)
  async validatePhone(
    @Body() dto: ValidatePhoneDto,
  ): Promise<PhoneResponceDto> {
    try {
      const fraudScore = await this.ipService.validatePhone(dto.phone);

      return {
        fraudPercentage: fraudScore,
      };
    } catch (err) {
      return {
        fraudPercentage: -1,
        error: `Error validating or sending sms: ${err}`,
      };
    }
  }
}

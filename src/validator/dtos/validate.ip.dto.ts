import { IsIP } from 'class-validator';
import { Transform } from 'class-transformer';

export class ValidateIpDto {
  @Transform(({ value }) => value.trim())
  @IsIP()
  ip: string;
}

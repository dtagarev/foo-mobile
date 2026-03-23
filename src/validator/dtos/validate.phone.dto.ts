import { IsPhoneNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class ValidatePhoneDto {
  @Transform(({ value }) => value.trim())
  //if validated it will not pass invalid number to the IPQS so removing it
  @IsPhoneNumber()
  phone: string;
}

import { IsNumber, Max, Min } from "class-validator";

export class PhoneResponceDto {
  @IsNumber()
  @Min(-1)
  @Max(100)
  fraudPercentage: number;
  error?: string;
}

import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class ValidateLicenseDto {
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  key!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceId?: string;
}

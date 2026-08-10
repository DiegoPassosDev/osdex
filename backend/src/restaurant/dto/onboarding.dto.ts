import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class OnboardingDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  serviceCharge?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  cancelWindowMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  acceptWindowMin?: number;

  @IsString()
  managerName!: string;

  @IsEmail()
  managerEmail!: string;

  @IsString()
  @MinLength(8)
  managerPassword!: string;

  @IsString()
  @MinLength(4)
  managerPin!: string;
}

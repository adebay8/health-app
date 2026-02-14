import {
  IsString,
  IsOptional,
  IsDateString,
  IsIn,
  MinLength,
} from 'class-validator';

export class SearchPatientDto {
  @IsString()
  @MinLength(1)
  given: string;

  @IsString()
  @MinLength(1)
  family: string;

  @IsDateString()
  birthdate: string;

  @IsOptional()
  @IsIn(['male', 'female', 'other', 'unknown'])
  gender?: string;

  @IsOptional()
  @IsString()
  identifier?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  telecom?: string;
}

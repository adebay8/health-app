import {
  IsString,
  IsOptional,
  IsDateString,
  IsIn,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchPatientDto {
  @ApiProperty({ example: 'Timothy' })
  @IsString()
  @MinLength(1)
  given: string;

  @ApiProperty({ example: 'Bixby' })
  @IsString()
  @MinLength(1)
  family: string;

  @ApiProperty({ example: '2008-01-06' })
  @IsDateString()
  birthdate: string;

  @ApiPropertyOptional({ enum: ['male', 'female', 'other', 'unknown'] })
  @IsOptional()
  @IsIn(['male', 'female', 'other', 'unknown'])
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  identifier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telecom?: string;
}

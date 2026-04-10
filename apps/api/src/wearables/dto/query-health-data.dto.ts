import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryHealthDataDto {
  @ApiPropertyOptional({
    example: 'sahha',
    description: 'Filter by provider name',
  })
  @IsOptional()
  @IsString()
  providerName?: string;

  @ApiPropertyOptional({
    example: 'sleep,activity',
    description: 'Comma-separated list of types or categories to filter',
  })
  @IsOptional()
  @IsString()
  types?: string;

  @ApiPropertyOptional({
    example: '2025-01-01',
    description: 'Start date for filtering results',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2025-12-31',
    description: 'End date for filtering results',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

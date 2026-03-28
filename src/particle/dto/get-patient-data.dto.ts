import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsISO8601 } from 'class-validator';

export class GetPatientDataDto {
  @ApiPropertyOptional({
    description: 'Response format',
    enum: ['fhir', 'flat', 'ccda'],
    default: 'fhir',
  })
  @IsString()
  @IsOptional()
  @IsIn(['fhir', 'flat', 'ccda'])
  format?: 'fhir' | 'flat' | 'ccda' = 'fhir';

  @ApiPropertyOptional({
    description: 'Only return data since this date (ISO date)',
    example: '2024-01-01',
  })
  @IsISO8601()
  @IsOptional()
  since?: string;

  @ApiPropertyOptional({
    description: 'Specific file ID to retrieve (for CCDA format)',
  })
  @IsString()
  @IsOptional()
  fileId?: string;
}

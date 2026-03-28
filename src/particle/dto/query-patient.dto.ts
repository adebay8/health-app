import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';

export class QueryPatientDto {
  @ApiPropertyOptional({
    description: 'Purpose of use for the query',
    enum: ['TREATMENT', 'HEALTHCARE_OPERATIONS', 'PAYMENT'],
    default: 'TREATMENT',
  })
  @IsString()
  @IsOptional()
  @IsIn(['TREATMENT', 'HEALTHCARE_OPERATIONS', 'PAYMENT'])
  purposeOfUse?: string = 'TREATMENT';
}

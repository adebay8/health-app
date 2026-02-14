import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MedicationSearchDto {
  @ApiProperty({ example: 'patient-123' })
  @IsString()
  @MinLength(1)
  patientId: string;

  @ApiPropertyOptional({ example: 'order' })
  @IsOptional()
  @IsString()
  intent?: string;
}

import { IsString, IsOptional, MinLength } from 'class-validator';

export class MedicationSearchDto {
  @IsString()
  @MinLength(1)
  patientId: string;

  @IsOptional()
  @IsString()
  intent?: string;
}

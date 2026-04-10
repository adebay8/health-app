import { IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterWearableProfileDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'The patient UUID to register with the wearable provider',
  })
  @IsUUID()
  patientId: string;

  @ApiProperty({
    example: 'sahha',
    description: 'The wearable provider name (e.g., sahha)',
  })
  @IsString()
  @MaxLength(50)
  providerName: string;
}

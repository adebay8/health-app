import { IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkExistingProfileDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'The patient UUID to link',
  })
  @IsUUID()
  patientId: string;

  @ApiProperty({
    example: 'sahha',
    description: 'The wearable provider name',
  })
  @IsString()
  @MaxLength(50)
  providerName: string;

  @ApiProperty({
    example: 'ext-12345',
    description: 'The external ID already registered with the provider',
  })
  @IsString()
  @MaxLength(255)
  externalId: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIs...',
    description: 'The profile token from the provider',
  })
  @IsString()
  profileToken: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsISO8601,
  IsArray,
} from 'class-validator';

export class RegisterPatientDto {
  @ApiProperty({ description: 'Patient first name' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'Patient last name' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: 'Date of birth (ISO date)', example: '1954-12-01' })
  @IsISO8601()
  @IsNotEmpty()
  dateOfBirth: string;

  @ApiProperty({ description: 'Patient gender', example: 'Male' })
  @IsString()
  @IsNotEmpty()
  gender: string;

  @ApiProperty({ description: 'City', example: 'Brooklyn' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'State', example: 'NY' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ description: 'ZIP code', example: '11111' })
  @IsString()
  @IsNotEmpty()
  zipCode: string;

  @ApiProperty({
    description: 'Unique patient identifier from your system',
    example: 'workbench-demo-test-patient-kqn',
  })
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Patient email' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Patient phone number' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Address lines',
    example: ['999 Dev Drive'],
    type: [String],
  })
  @IsArray()
  @IsOptional()
  addressLines?: string[];
}

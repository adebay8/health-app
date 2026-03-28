import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ParticleService } from './particle.service';
import { RegisterPatientDto } from './dto/register-patient.dto';
import { QueryPatientDto } from './dto/query-patient.dto';
import { GetPatientDataDto } from './dto/get-patient-data.dto';

@ApiTags('Particle')
@Controller('particle')
export class ParticleController {
  constructor(private readonly particleService: ParticleService) {}

  @Post('patients/register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Register patient with Particle',
    description:
      'Register a patient with Particle Health using demographics. Returns a particlePatientId for subsequent queries.',
  })
  async registerPatient(@Body() dto: RegisterPatientDto) {
    return this.particleService.registerPatient(dto);
  }

  @Post('patients/:particlePatientId/query')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Launch async query',
    description:
      'Trigger an asynchronous health record query for a registered patient.',
  })
  async launchQuery(
    @Param('particlePatientId') particlePatientId: string,
    @Body() dto: QueryPatientDto,
  ) {
    return this.particleService.launchQuery(particlePatientId, dto.purposeOfUse);
  }

  @Get('patients/:particlePatientId/query/status')
  @ApiOperation({
    summary: 'Check query status',
    description:
      'Poll to check whether the async query for a patient is complete.',
  })
  async getQueryStatus(
    @Param('particlePatientId') particlePatientId: string,
  ) {
    return this.particleService.getQueryStatus(particlePatientId);
  }

  @Get('patients/:particlePatientId/data')
  @ApiOperation({
    summary: 'Retrieve patient health records',
    description:
      'Get health records for a patient in FHIR R4, flat, or C-CDA format.',
  })
  async getPatientData(
    @Param('particlePatientId') particlePatientId: string,
    @Query() dto: GetPatientDataDto,
  ) {
    return this.particleService.getPatientData(particlePatientId, dto);
  }

  @Get('files/:queryId/:fileId')
  @ApiOperation({
    summary: 'Download file',
    description: 'Download a specific C-CDA or other file by query ID and file ID.',
  })
  async getFile(
    @Param('queryId') queryId: string,
    @Param('fileId') fileId: string,
  ) {
    return this.particleService.getFile(queryId, fileId);
  }

  @Delete('patients/:particlePatientId')
  @ApiOperation({
    summary: 'Delete patient',
    description: 'Delete a patient registration from Particle Health.',
  })
  async deletePatient(
    @Param('particlePatientId') particlePatientId: string,
  ) {
    return this.particleService.deletePatient(particlePatientId);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WearablesService } from './wearables.service';
import { RegisterWearableProfileDto } from './dto/register-wearable-profile.dto';
import { LinkExistingProfileDto } from './dto/link-existing-profile.dto';
import { QueryHealthDataDto } from './dto/query-health-data.dto';

@ApiTags('Wearables')
@Controller('wearables')
export class WearablesController {
  constructor(private readonly wearablesService: WearablesService) {}

  @Post('profiles/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register wearable profile',
    description:
      'Register a patient with a wearable data provider (e.g., Sahha)',
  })
  registerProfile(@Body() dto: RegisterWearableProfileDto) {
    return this.wearablesService.registerProfile(dto);
  }

  @Post('profiles/link')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Link existing profile',
    description:
      'Link a pre-existing provider profile (e.g., Sahha sample profile) to a patient',
  })
  linkExistingProfile(@Body() dto: LinkExistingProfileDto) {
    return this.wearablesService.linkExistingProfile(dto);
  }

  @Get('profiles/patient/:patientId')
  @ApiOperation({
    summary: 'Get patient profiles',
    description: 'Get all wearable profiles for a patient',
  })
  getPatientProfiles(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.wearablesService.getPatientProfiles(patientId);
  }

  @Get('patients/:patientId/scores')
  @ApiOperation({
    summary: 'Fetch live health scores',
    description: 'Fetch health scores directly from the wearable provider',
  })
  getLiveScores(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() query: QueryHealthDataDto,
  ) {
    return this.wearablesService.getLiveScores(patientId, query);
  }

  @Get('patients/:patientId/biomarkers')
  @ApiOperation({
    summary: 'Fetch live biomarkers',
    description: 'Fetch biomarkers directly from the wearable provider',
  })
  getLiveBiomarkers(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() query: QueryHealthDataDto,
  ) {
    return this.wearablesService.getLiveBiomarkers(patientId, query);
  }

  @Get('patients/:patientId/scores/history')
  @ApiOperation({
    summary: 'Get stored health scores',
    description:
      'Get health scores stored in the database from webhook events',
  })
  getStoredScores(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() query: QueryHealthDataDto,
  ) {
    return this.wearablesService.getStoredScores(patientId, query);
  }

  @Get('patients/:patientId/biomarkers/history')
  @ApiOperation({
    summary: 'Get stored biomarkers',
    description: 'Get biomarkers stored in the database from webhook events',
  })
  getStoredBiomarkers(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() query: QueryHealthDataDto,
  ) {
    return this.wearablesService.getStoredBiomarkers(patientId, query);
  }
}

import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard/patients')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'List demo patients for the dashboard switcher' })
  list() {
    return this.service.listPatients();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get the full normalized payload for a patient' })
  getOne(@Param('id') id: string) {
    return this.service.getPatientPayload(id);
  }

  @Post(':id/refresh')
  @ApiOperation({ summary: 'Re-run the normalizer against the patient fixture' })
  refresh(@Param('id') id: string) {
    return this.service.refreshFromFixture(id);
  }
}

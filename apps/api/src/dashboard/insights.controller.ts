import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { InsightsService } from './insights.service';

class AskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  question: string;
}

@ApiTags('insights')
@Controller('dashboard/patients')
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  @Get(':id/insights')
  @ApiOperation({ summary: 'Get deterministic insights + narration for a patient' })
  getInsights(@Param('id') id: string) {
    return this.insights.getInsights(id);
  }

  @Post(':id/ask')
  @ApiOperation({ summary: 'Single-shot Q&A against the patient record' })
  ask(@Param('id') id: string, @Body() dto: AskDto) {
    return this.insights.ask(id, dto.question);
  }
}

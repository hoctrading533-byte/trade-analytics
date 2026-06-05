import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
// import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
// import { GetAnalyticsRequestDto } from '../dtos/get-analytics.dto';

@Controller('api/v2/analytics')
// @UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus
  ) {}

  @Get(':accountId/insights')
  async getInsights(
    @Param('accountId', ParseIntPipe) accountId: number,
    @Query('date') dateStr: string
  ) {
    console.log(`[REST] GET /api/v2/analytics/${accountId}/insights`);
    
    // Example of triggering a CQRS Query
    /*
      return this.queryBus.execute(new GetDailyInsightsQuery(accountId, dateStr));
    */
    
    return {
      success: true,
      data: { message: "DDD / CQRS Architecture Scaffolded Successfully" }
    };
  }
}

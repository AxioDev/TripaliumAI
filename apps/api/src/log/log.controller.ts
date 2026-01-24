import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { LogService } from './log.service';
import { CombinedAuthGuard } from '../auth/guards/combined-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Logs')
@Controller('logs')
@UseGuards(CombinedAuthGuard)
@ApiBearerAuth()
@ApiSecurity('api-key')
export class LogController {
  constructor(private readonly logService: LogService) {}

  @Get()
  @ApiOperation({ summary: 'Query action logs' })
  async query(
    @CurrentUser() user: { id: string },
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.logService.query({
      userId: user.id,
      entityType,
      entityId,
      action,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: page || 1,
      limit: Math.min(limit || 20, 100),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get log entry by ID' })
  async getById(@Param('id') id: string) {
    return this.logService.getById(id);
  }
}

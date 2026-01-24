import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { CampaignService } from './campaign.service';
import { CombinedAuthGuard } from '../auth/guards/combined-auth.guard';
import { RequiredScope } from '../auth/decorators/required-scope.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiKeyScope } from '@tripalium/shared';

@ApiTags('Campaigns')
@Controller('campaigns')
@UseGuards(CombinedAuthGuard)
@ApiBearerAuth()
@ApiSecurity('api-key')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Get()
  @ApiOperation({ summary: 'List all campaigns' })
  async listCampaigns(@CurrentUser() user: { id: string }) {
    return this.campaignService.listCampaigns(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign by ID' })
  async getCampaign(
    @CurrentUser() user: { id: string },
    @Param('id') campaignId: string,
  ) {
    return this.campaignService.getCampaign(campaignId, user.id);
  }

  @Post()
  @RequiredScope(ApiKeyScope.WRITE)
  @ApiOperation({ summary: 'Create a campaign' })
  async createCampaign(
    @CurrentUser() user: { id: string },
    @Body() data: Record<string, unknown>,
  ) {
    return this.campaignService.createCampaign(
      user.id,
      data as unknown as Parameters<typeof this.campaignService.createCampaign>[1],
    );
  }

  @Put(':id')
  @RequiredScope(ApiKeyScope.WRITE)
  @ApiOperation({ summary: 'Update campaign' })
  async updateCampaign(
    @CurrentUser() user: { id: string },
    @Param('id') campaignId: string,
    @Body() data: Record<string, unknown>,
  ) {
    return this.campaignService.updateCampaign(
      campaignId,
      user.id,
      data as unknown as Parameters<typeof this.campaignService.updateCampaign>[2],
    );
  }

  @Post(':id/start')
  @RequiredScope(ApiKeyScope.WRITE)
  @ApiOperation({ summary: 'Start campaign' })
  async startCampaign(
    @CurrentUser() user: { id: string },
    @Param('id') campaignId: string,
  ) {
    return this.campaignService.startCampaign(campaignId, user.id);
  }

  @Post(':id/pause')
  @RequiredScope(ApiKeyScope.WRITE)
  @ApiOperation({ summary: 'Pause campaign' })
  async pauseCampaign(
    @CurrentUser() user: { id: string },
    @Param('id') campaignId: string,
  ) {
    return this.campaignService.pauseCampaign(campaignId, user.id);
  }

  @Post(':id/stop')
  @RequiredScope(ApiKeyScope.WRITE)
  @ApiOperation({ summary: 'Stop campaign' })
  async stopCampaign(
    @CurrentUser() user: { id: string },
    @Param('id') campaignId: string,
  ) {
    return this.campaignService.stopCampaign(campaignId, user.id);
  }

  @Delete(':id')
  @RequiredScope(ApiKeyScope.WRITE)
  @ApiOperation({ summary: 'Delete campaign' })
  async deleteCampaign(
    @CurrentUser() user: { id: string },
    @Param('id') campaignId: string,
  ) {
    return this.campaignService.deleteCampaign(campaignId, user.id);
  }
}

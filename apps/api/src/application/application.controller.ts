import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { ApplicationService } from './application.service';
import { CombinedAuthGuard } from '../auth/guards/combined-auth.guard';
import { RequiredScope } from '../auth/decorators/required-scope.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiKeyScope, ApplicationStatus } from '@tripalium/shared';

@ApiTags('Applications')
@Controller('applications')
@UseGuards(CombinedAuthGuard)
@ApiBearerAuth()
@ApiSecurity('api-key')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Get()
  @ApiOperation({ summary: 'List applications' })
  async listApplications(
    @CurrentUser() user: { id: string },
    @Query('campaignId') campaignId?: string,
    @Query('status') status?: ApplicationStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.applicationService.listApplications(user.id, {
      campaignId,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: Math.min(limit ? parseInt(limit, 10) : 20, 100),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get application by ID' })
  async getApplication(
    @CurrentUser() user: { id: string },
    @Param('id') applicationId: string,
  ) {
    return this.applicationService.getApplication(applicationId, user.id);
  }

  @Post(':id/confirm')
  @RequiredScope(ApiKeyScope.WRITE)
  @ApiOperation({ summary: 'Confirm application for submission' })
  async confirmApplication(
    @CurrentUser() user: { id: string },
    @Param('id') applicationId: string,
    @Body() data: { notes?: string },
  ) {
    return this.applicationService.confirmApplication(
      applicationId,
      user.id,
      data.notes,
    );
  }

  @Post(':id/withdraw')
  @RequiredScope(ApiKeyScope.WRITE)
  @ApiOperation({ summary: 'Withdraw application' })
  async withdrawApplication(
    @CurrentUser() user: { id: string },
    @Param('id') applicationId: string,
  ) {
    return this.applicationService.withdrawApplication(applicationId, user.id);
  }

  @Post(':id/mark-submitted')
  @RequiredScope(ApiKeyScope.WRITE)
  @ApiOperation({ summary: 'Mark application as submitted' })
  async markSubmitted(
    @CurrentUser() user: { id: string },
    @Param('id') applicationId: string,
    @Body() data: { notes?: string },
  ) {
    return this.applicationService.markSubmitted(
      applicationId,
      user.id,
      data.notes,
    );
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'List generated documents for application' })
  async getDocuments(
    @CurrentUser() user: { id: string },
    @Param('id') applicationId: string,
  ) {
    return this.applicationService.getDocuments(applicationId, user.id);
  }

  @Post(':id/regenerate')
  @RequiredScope(ApiKeyScope.WRITE)
  @ApiOperation({ summary: 'Regenerate documents for application' })
  async regenerateDocuments(
    @CurrentUser() user: { id: string },
    @Param('id') applicationId: string,
  ) {
    return this.applicationService.regenerateDocuments(applicationId, user.id);
  }

  @Post(':id/send-email')
  @RequiredScope(ApiKeyScope.WRITE)
  @ApiOperation({ summary: 'Send application via email' })
  async sendApplicationEmail(
    @CurrentUser() user: { id: string },
    @Param('id') applicationId: string,
    @Body() data: { recipientEmail: string; customMessage?: string },
  ) {
    return this.applicationService.sendApplicationEmail(
      applicationId,
      user.id,
      data.recipientEmail,
      data.customMessage,
    );
  }

  @Get(':id/emails')
  @ApiOperation({ summary: 'List emails sent for application' })
  async getApplicationEmails(
    @CurrentUser() user: { id: string },
    @Param('id') applicationId: string,
  ) {
    return this.applicationService.getApplicationEmails(applicationId, user.id);
  }
}

@ApiTags('Documents')
@Controller('documents')
@UseGuards(CombinedAuthGuard)
@ApiBearerAuth()
@ApiSecurity('api-key')
export class DocumentController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get document metadata' })
  async getDocument(
    @CurrentUser() user: { id: string },
    @Param('id') documentId: string,
  ) {
    return this.applicationService.getDocument(documentId, user.id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download document' })
  async downloadDocument(
    @CurrentUser() user: { id: string },
    @Param('id') documentId: string,
    @Res() res: Response,
  ) {
    const { filePath, fileName } =
      await this.applicationService.downloadDocument(documentId, user.id);
    res.download(filePath, fileName);
  }

  @Get(':id/content')
  @ApiOperation({ summary: 'Get document content' })
  async getDocumentContent(
    @CurrentUser() user: { id: string },
    @Param('id') documentId: string,
  ) {
    return this.applicationService.getDocumentContent(documentId, user.id);
  }
}

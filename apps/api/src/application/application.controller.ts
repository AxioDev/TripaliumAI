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
import { PdfGeneratorService, GeneratedCVContent } from './pdf-generator.service';
import { CanvaExportService } from './canva-export.service';
import { CombinedAuthGuard } from '../auth/guards/combined-auth.guard';
import { RequiredScope } from '../auth/decorators/required-scope.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiKeyScope, ApplicationStatus, DocumentType } from '@tripalium/shared';
import { CVTemplateId } from './templates/template-config';

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
  constructor(
    private readonly applicationService: ApplicationService,
    private readonly pdfGeneratorService: PdfGeneratorService,
    private readonly canvaExportService: CanvaExportService,
  ) {}

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

  @Get(':id/export/png')
  @ApiOperation({ summary: 'Export CV as PNG (for Canva import)' })
  async exportPng(
    @CurrentUser() user: { id: string },
    @Param('id') documentId: string,
    @Query('templateId') templateId: string | undefined,
    @Res() res: Response,
  ) {
    const doc = await this.applicationService.getDocument(documentId, user.id);

    if (doc.type !== DocumentType.CV) {
      res.status(400).json({ error: 'PNG export only available for CV documents' });
      return;
    }

    const content = await this.applicationService.getDocumentContent(documentId, user.id);
    const template = (templateId as CVTemplateId) || (doc.templateId as CVTemplateId) || 'professional';

    const png = await this.pdfGeneratorService.generateCVPng(
      content.content as unknown as GeneratedCVContent,
      template,
    );

    const fileName = doc.fileName.replace('.json', '.png').replace('.pdf', '.png');
    res.set('Content-Type', 'image/png');
    res.set('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(png);
  }

  @Get(':id/export/canva')
  @ApiOperation({ summary: 'Export CV as Canva-compatible JSON template' })
  async exportCanva(
    @CurrentUser() user: { id: string },
    @Param('id') documentId: string,
    @Query('templateId') templateId: string | undefined,
  ) {
    const doc = await this.applicationService.getDocument(documentId, user.id);

    if (doc.type !== DocumentType.CV) {
      return { error: 'Canva export only available for CV documents' };
    }

    const content = await this.applicationService.getDocumentContent(documentId, user.id);
    const template = (templateId as CVTemplateId) || (doc.templateId as CVTemplateId) || 'professional';

    const canvaTemplate = this.canvaExportService.generateCanvaTemplate(
      content.content as unknown as GeneratedCVContent,
      template,
    );

    return {
      success: true,
      template: canvaTemplate,
    };
  }
}

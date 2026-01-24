import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiSecurity,
  ApiConsumes,
} from '@nestjs/swagger';
import { CvService } from './cv.service';
import { CombinedAuthGuard } from '../auth/guards/combined-auth.guard';
import { RequiredScope } from '../auth/decorators/required-scope.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiKeyScope } from '@tripalium/shared';
import { StorageService } from '../storage/storage.service';

@ApiTags('CVs')
@Controller('cvs')
@UseGuards(CombinedAuthGuard)
@ApiBearerAuth()
@ApiSecurity('api-key')
export class CvController {
  constructor(
    private readonly cvService: CvService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all CVs' })
  async listCvs(@CurrentUser() user: { id: string }) {
    return this.cvService.listCvs(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get CV by ID' })
  async getCv(
    @CurrentUser() user: { id: string },
    @Param('id') cvId: string,
  ) {
    return this.cvService.getCv(cvId, user.id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download CV file' })
  async downloadCv(
    @CurrentUser() user: { id: string },
    @Param('id') cvId: string,
    @Res() res: Response,
  ) {
    const cv = await this.cvService.getCv(cvId, user.id);
    const filePath = this.storageService.getAbsolutePath(cv.filePath);

    res.download(filePath, cv.fileName);
  }

  @Get(':id/parsed-data')
  @ApiOperation({ summary: 'Get parsed CV data' })
  async getParsedData(
    @CurrentUser() user: { id: string },
    @Param('id') cvId: string,
  ) {
    const cv = await this.cvService.getCv(cvId, user.id);
    return cv.parsedData;
  }

  @Post('upload')
  @RequiredScope(ApiKeyScope.WRITE)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a CV' })
  @ApiConsumes('multipart/form-data')
  async uploadCv(
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.cvService.uploadCv(user.id, {
      buffer: file.buffer,
      originalname: file.originalname,
      size: file.size,
    });
  }

  @Post(':id/parse')
  @RequiredScope(ApiKeyScope.WRITE)
  @ApiOperation({ summary: 'Trigger CV parsing' })
  async triggerParse(
    @CurrentUser() user: { id: string },
    @Param('id') cvId: string,
  ) {
    return this.cvService.triggerParse(cvId, user.id);
  }

  @Post(':id/baseline')
  @RequiredScope(ApiKeyScope.WRITE)
  @ApiOperation({ summary: 'Set CV as baseline' })
  async setBaseline(
    @CurrentUser() user: { id: string },
    @Param('id') cvId: string,
  ) {
    return this.cvService.setBaseline(cvId, user.id);
  }

  @Delete(':id')
  @RequiredScope(ApiKeyScope.WRITE)
  @ApiOperation({ summary: 'Delete CV' })
  async deleteCv(
    @CurrentUser() user: { id: string },
    @Param('id') cvId: string,
  ) {
    return this.cvService.deleteCv(cvId, user.id);
  }
}

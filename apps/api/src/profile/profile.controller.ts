import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiSecurity,
  ApiConsumes,
} from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { CombinedAuthGuard } from '../auth/guards/combined-auth.guard';
import { RequiredScope } from '../auth/decorators/required-scope.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiKeyScope } from '@tripalium/shared';
import { StorageService } from '../storage/storage.service';

@ApiTags('Profile')
@Controller('profile')
@UseGuards(CombinedAuthGuard)
@ApiBearerAuth()
@ApiSecurity('api-key')
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: { id: string }, @Res() res: Response) {
    const profile = await this.profileService.getProfile(user.id);
    return res.json(profile ?? null);
  }

  @Put()
  @RequiredScope(ApiKeyScope.WRITE)
  @ApiOperation({ summary: 'Update profile' })
  async updateProfile(
    @CurrentUser() user: { id: string },
    @Body() data: Record<string, unknown>,
  ) {
    return this.profileService.updateProfile(user.id, data);
  }

  @Post('photo')
  @RequiredScope(ApiKeyScope.WRITE)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload profile photo' })
  @ApiConsumes('multipart/form-data')
  async uploadPhoto(
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    const stored = await this.storageService.store(
      file.buffer,
      file.originalname,
      'photos',
      user.id,
    );

    await this.profileService.updateProfile(user.id, {
      photoUrl: stored.path,
    });

    return { photoUrl: stored.path };
  }

  @Put('experiences')
  @RequiredScope(ApiKeyScope.WRITE)
  @ApiOperation({ summary: 'Update work experiences' })
  async updateExperiences(
    @CurrentUser() user: { id: string },
    @Body() data: { experiences: Array<Record<string, unknown>> },
  ) {
    return this.profileService.updateWorkExperiences(
      user.id,
      data.experiences as Parameters<typeof this.profileService.updateWorkExperiences>[1],
    );
  }

  @Put('education')
  @RequiredScope(ApiKeyScope.WRITE)
  @ApiOperation({ summary: 'Update education' })
  async updateEducation(
    @CurrentUser() user: { id: string },
    @Body() data: { educations: Array<Record<string, unknown>> },
  ) {
    return this.profileService.updateEducations(
      user.id,
      data.educations as Parameters<typeof this.profileService.updateEducations>[1],
    );
  }

  @Put('skills')
  @RequiredScope(ApiKeyScope.WRITE)
  @ApiOperation({ summary: 'Update skills' })
  async updateSkills(
    @CurrentUser() user: { id: string },
    @Body() data: { skills: Array<Record<string, unknown>> },
  ) {
    return this.profileService.updateSkills(
      user.id,
      data.skills as Parameters<typeof this.profileService.updateSkills>[1],
    );
  }

  @Put('languages')
  @RequiredScope(ApiKeyScope.WRITE)
  @ApiOperation({ summary: 'Update languages' })
  async updateLanguages(
    @CurrentUser() user: { id: string },
    @Body() data: { languages: Array<Record<string, unknown>> },
  ) {
    return this.profileService.updateLanguages(
      user.id,
      data.languages as Parameters<typeof this.profileService.updateLanguages>[1],
    );
  }

  @Post('regenerate-embedding')
  @RequiredScope(ApiKeyScope.WRITE)
  @ApiOperation({ summary: 'Regenerate profile embedding' })
  async regenerateEmbedding(@CurrentUser() user: { id: string }) {
    await this.profileService.regenerateEmbedding(user.id);
    return { success: true };
  }
}

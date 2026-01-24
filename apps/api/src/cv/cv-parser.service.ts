import { Injectable, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { OpenAIService } from '../llm/openai.service';
import { LogService } from '../log/log.service';
import { QueueService, JobPayload } from '../queue/queue.service';
import { ProfileService } from '../profile/profile.service';
import { ActionType, ParsingStatus } from '@tripalium/shared';
import { cvParseResultSchema } from '@tripalium/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class CvParserService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly openaiService: OpenAIService,
    private readonly logService: LogService,
    private readonly queueService: QueueService,
    private readonly profileService: ProfileService,
  ) {}

  onModuleInit() {
    // Register the job handler
    this.queueService.registerHandler('cv.parse', this.handleParseJob.bind(this));
  }

  async handleParseJob(job: Job<JobPayload>) {
    const { cvId, userId } = job.data.data as { cvId: string; userId: string };

    await this.logService.log({
      userId,
      entityType: 'cv',
      entityId: cvId,
      action: ActionType.CV_PARSE_STARTED,
    });

    try {
      // Update status
      await this.prisma.cV.update({
        where: { id: cvId },
        data: { parsingStatus: ParsingStatus.PROCESSING },
      });

      // Get CV file
      const cv = await this.prisma.cV.findUnique({
        where: { id: cvId },
      });

      if (!cv) {
        throw new Error('CV not found');
      }

      // Read the PDF file
      const fileBuffer = await this.storageService.read(cv.filePath);

      // Convert PDF to images
      const images = await this.convertPdfToImages(fileBuffer);

      // Parse using Vision API
      const parsedData = await this.openaiService.parseCV(
        images,
        cvParseResultSchema,
        'cv_parse_result',
      );

      // Update CV with parsed data
      await this.prisma.cV.update({
        where: { id: cvId },
        data: {
          parsingStatus: ParsingStatus.COMPLETED,
          parsedData: parsedData as unknown as Prisma.InputJsonValue,
        },
      });

      // Create/update profile from parsed data
      await this.updateProfileFromParsedData(userId, parsedData);

      await this.logService.log({
        userId,
        entityType: 'cv',
        entityId: cvId,
        action: ActionType.CV_PARSED,
        metadata: { confidence: parsedData.extractionConfidence },
      });

      return parsedData;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      await this.prisma.cV.update({
        where: { id: cvId },
        data: {
          parsingStatus: ParsingStatus.FAILED,
          parsingError: errorMessage,
        },
      });

      await this.logService.log({
        userId,
        entityType: 'cv',
        entityId: cvId,
        action: ActionType.CV_PARSE_FAILED,
        status: 'failure',
        errorMessage,
      });

      throw error;
    }
  }

  private async convertPdfToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
    // Use pdf-img-convert to convert PDF pages to images
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfToImg = require('pdf-img-convert');

    const outputImages = await pdfToImg.convert(pdfBuffer, {
      width: 2000, // High resolution for better OCR
      height: 2800,
      page_numbers: [1, 2, 3, 4, 5], // Max 5 pages
    });

    return outputImages.map((img: Uint8Array) => Buffer.from(img));
  }

  private async updateProfileFromParsedData(
    userId: string,
    data: {
      personalInfo: {
        firstName: string;
        lastName: string;
        email: string | null;
        phone: string | null;
        location: string | null;
        linkedIn: string | null;
        website: string | null;
      };
      summary: string | null;
      workExperience: Array<{
        company: string;
        title: string;
        location: string | null;
        startDate: string;
        endDate: string | null;
        description: string;
        highlights: string[];
      }>;
      education: Array<{
        institution: string;
        degree: string;
        field: string | null;
        startDate: string | null;
        endDate: string | null;
        gpa: string | null;
        description: string | null;
      }>;
      skills: Array<{
        name: string;
        category: string | null;
        level: string | null;
      }>;
      languages: Array<{
        name: string;
        proficiency: string;
      }>;
    },
  ) {
    // Check if profile exists
    let profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      // Create profile
      profile = await this.profileService.createProfile(userId, {
        firstName: data.personalInfo.firstName,
        lastName: data.personalInfo.lastName,
        email: data.personalInfo.email || undefined,
        phone: data.personalInfo.phone || undefined,
        location: data.personalInfo.location || undefined,
        linkedIn: data.personalInfo.linkedIn || undefined,
        website: data.personalInfo.website || undefined,
        summary: data.summary || undefined,
      });
    } else {
      // Update profile
      await this.profileService.updateProfile(userId, {
        firstName: data.personalInfo.firstName,
        lastName: data.personalInfo.lastName,
        email: data.personalInfo.email,
        phone: data.personalInfo.phone,
        location: data.personalInfo.location,
        linkedIn: data.personalInfo.linkedIn,
        website: data.personalInfo.website,
        summary: data.summary,
      });
    }

    // Update work experiences
    if (data.workExperience.length > 0) {
      await this.profileService.updateWorkExperiences(
        userId,
        data.workExperience.map((exp) => ({
          company: exp.company,
          title: exp.title,
          location: exp.location || undefined,
          startDate: new Date(exp.startDate),
          endDate: exp.endDate ? new Date(exp.endDate) : undefined,
          description: exp.description,
          highlights: exp.highlights,
        })),
      );
    }

    // Update education
    if (data.education.length > 0) {
      await this.profileService.updateEducations(
        userId,
        data.education.map((edu) => ({
          institution: edu.institution,
          degree: edu.degree,
          field: edu.field || undefined,
          startDate: edu.startDate ? new Date(edu.startDate) : undefined,
          endDate: edu.endDate ? new Date(edu.endDate) : undefined,
          gpa: edu.gpa || undefined,
          description: edu.description || undefined,
        })),
      );
    }

    // Update skills
    if (data.skills.length > 0) {
      await this.profileService.updateSkills(
        userId,
        data.skills.map((skill) => ({
          name: skill.name,
          category: skill.category || undefined,
          level: skill.level || undefined,
        })),
      );
    }

    // Update languages
    if (data.languages.length > 0) {
      await this.profileService.updateLanguages(userId, data.languages);
    }
  }
}

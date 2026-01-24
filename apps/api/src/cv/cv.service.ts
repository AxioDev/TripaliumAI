import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { LogService } from '../log/log.service';
import { QueueService } from '../queue/queue.service';
import { ActionType, CVType, ParsingStatus } from '@tripalium/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class CvService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly logService: LogService,
    private readonly queueService: QueueService,
  ) {}

  async uploadCv(
    userId: string,
    file: { buffer: Buffer; originalname: string; size: number },
  ) {
    // Store the file
    const stored = await this.storageService.store(
      file.buffer,
      file.originalname,
      'cvs',
      userId,
    );

    // Create CV record
    const cv = await this.prisma.cV.create({
      data: {
        userId,
        type: CVType.UPLOADED,
        fileName: file.originalname,
        filePath: stored.path,
        fileSize: file.size,
        mimeType: stored.mimeType,
        parsingStatus: ParsingStatus.PENDING,
      },
    });

    await this.logService.log({
      userId,
      entityType: 'cv',
      entityId: cv.id,
      action: ActionType.CV_UPLOADED,
      metadata: { fileName: file.originalname, fileSize: file.size },
    });

    // Queue parsing job
    await this.queueService.addJob({
      type: 'cv.parse',
      data: { cvId: cv.id, userId },
      userId,
    });

    return cv;
  }

  async getCv(cvId: string, userId: string) {
    const cv = await this.prisma.cV.findFirst({
      where: { id: cvId, userId },
    });

    if (!cv) {
      throw new NotFoundException('CV not found');
    }

    return cv;
  }

  async listCvs(userId: string) {
    return this.prisma.cV.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async setBaseline(cvId: string, userId: string) {
    // Unset current baseline
    await this.prisma.cV.updateMany({
      where: { userId, isBaseline: true },
      data: { isBaseline: false },
    });

    // Set new baseline
    const cv = await this.prisma.cV.update({
      where: { id: cvId },
      data: { isBaseline: true },
    });

    return cv;
  }

  async deleteCv(cvId: string, userId: string) {
    const cv = await this.getCv(cvId, userId);

    // Delete file
    await this.storageService.delete(cv.filePath);

    // Delete record
    await this.prisma.cV.delete({
      where: { id: cvId },
    });

    return { success: true };
  }

  async updateParsingStatus(
    cvId: string,
    status: ParsingStatus,
    parsedData?: Record<string, unknown>,
    error?: string,
  ) {
    return this.prisma.cV.update({
      where: { id: cvId },
      data: {
        parsingStatus: status,
        parsedData: parsedData as Prisma.InputJsonValue | undefined,
        parsingError: error,
      },
    });
  }

  async triggerParse(cvId: string, userId: string) {
    const cv = await this.getCv(cvId, userId);

    await this.prisma.cV.update({
      where: { id: cvId },
      data: { parsingStatus: ParsingStatus.PENDING },
    });

    await this.queueService.addJob({
      type: 'cv.parse',
      data: { cvId: cv.id, userId },
      userId,
    });

    return { jobQueued: true };
  }
}

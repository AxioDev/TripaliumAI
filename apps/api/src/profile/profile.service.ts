import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogService } from '../log/log.service';
import { OpenAIService } from '../llm/openai.service';
import { ActionType } from '@tripalium/shared';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logService: LogService,
    private readonly openaiService: OpenAIService,
  ) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        workExperiences: { orderBy: { sortOrder: 'asc' } },
        educations: { orderBy: { sortOrder: 'asc' } },
        skills: { orderBy: { sortOrder: 'asc' } },
        languages: true,
        certifications: true,
      },
    });

    return profile;
  }

  async createProfile(
    userId: string,
    data: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      location?: string;
      linkedIn?: string;
      website?: string;
      summary?: string;
    },
  ) {
    const profile = await this.prisma.profile.create({
      data: {
        userId,
        ...data,
      },
    });

    await this.logService.log({
      userId,
      entityType: 'profile',
      entityId: profile.id,
      action: ActionType.PROFILE_CREATED,
    });

    return profile;
  }

  async updateProfile(userId: string, data: Record<string, unknown>) {
    const existingProfile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    const isCreate = !existingProfile;

    const profile = await this.prisma.profile.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        firstName: (data.firstName as string) || '',
        lastName: (data.lastName as string) || '',
        ...data,
      },
      include: {
        workExperiences: { orderBy: { sortOrder: 'asc' } },
        educations: { orderBy: { sortOrder: 'asc' } },
        skills: { orderBy: { sortOrder: 'asc' } },
        languages: true,
        certifications: true,
      },
    });

    await this.logService.log({
      userId,
      entityType: 'profile',
      entityId: profile.id,
      action: isCreate ? ActionType.PROFILE_CREATED : ActionType.PROFILE_UPDATED,
      metadata: { fields: Object.keys(data) },
    });

    return profile;
  }

  async updateWorkExperiences(
    userId: string,
    experiences: Array<{
      id?: string;
      company: string;
      title: string;
      location?: string;
      startDate: Date;
      endDate?: Date;
      description?: string;
      highlights?: string[];
    }>,
  ) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // Delete existing and recreate (simpler for POC)
    await this.prisma.workExperience.deleteMany({
      where: { profileId: profile.id },
    });

    const created = await this.prisma.workExperience.createMany({
      data: experiences.map((exp, index) => ({
        profileId: profile.id,
        company: exp.company,
        title: exp.title,
        location: exp.location,
        startDate: new Date(exp.startDate),
        endDate: exp.endDate ? new Date(exp.endDate) : null,
        description: exp.description,
        highlights: exp.highlights || [],
        sortOrder: index,
      })),
    });

    await this.regenerateEmbedding(userId);

    return created;
  }

  async updateEducations(
    userId: string,
    educations: Array<{
      id?: string;
      institution: string;
      degree: string;
      field?: string;
      startDate?: Date;
      endDate?: Date;
      gpa?: string;
      description?: string;
    }>,
  ) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    await this.prisma.education.deleteMany({
      where: { profileId: profile.id },
    });

    const created = await this.prisma.education.createMany({
      data: educations.map((edu, index) => ({
        profileId: profile.id,
        institution: edu.institution,
        degree: edu.degree,
        field: edu.field,
        startDate: edu.startDate ? new Date(edu.startDate) : null,
        endDate: edu.endDate ? new Date(edu.endDate) : null,
        gpa: edu.gpa,
        description: edu.description,
        sortOrder: index,
      })),
    });

    await this.regenerateEmbedding(userId);

    return created;
  }

  async updateSkills(
    userId: string,
    skills: Array<{
      id?: string;
      name: string;
      category?: string;
      level?: string;
      yearsOfExp?: number;
    }>,
  ) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    await this.prisma.skill.deleteMany({
      where: { profileId: profile.id },
    });

    const created = await this.prisma.skill.createMany({
      data: skills.map((skill, index) => ({
        profileId: profile.id,
        name: skill.name,
        category: skill.category,
        level: skill.level,
        yearsOfExp: skill.yearsOfExp,
        sortOrder: index,
      })),
    });

    await this.regenerateEmbedding(userId);

    return created;
  }

  async updateLanguages(
    userId: string,
    languages: Array<{
      id?: string;
      name: string;
      proficiency: string;
    }>,
  ) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    await this.prisma.language.deleteMany({
      where: { profileId: profile.id },
    });

    const created = await this.prisma.language.createMany({
      data: languages.map((lang) => ({
        profileId: profile.id,
        name: lang.name,
        proficiency: lang.proficiency,
      })),
    });

    return created;
  }

  async regenerateEmbedding(userId: string) {
    const profile = await this.getProfile(userId);
    if (!profile) return;

    // Build text representation for embedding
    const parts = [
      profile.summary,
      profile.workExperiences
        .map((e) => `${e.title} at ${e.company}: ${e.description}`)
        .join(' '),
      profile.skills.map((s) => s.name).join(', '),
      profile.educations.map((e) => `${e.degree} ${e.field}`).join(', '),
    ].filter(Boolean);

    const text = parts.join('\n\n');

    try {
      const embedding = await this.openaiService.generateEmbedding(text);

      // Update embedding using raw SQL (Prisma doesn't support vector type directly)
      await this.prisma.$executeRaw`
        UPDATE profiles
        SET embedding = ${embedding}::vector
        WHERE id = ${profile.id}
      `;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
    }
  }
}

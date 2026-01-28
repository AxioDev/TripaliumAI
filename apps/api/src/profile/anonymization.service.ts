import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Profile data structure for anonymization
 */
interface ProfileData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedInUrl?: string;
  websiteUrl?: string;
  photoUrl?: string;
  summary?: string;
  motivationText?: string;
  workExperiences?: Array<{
    title: string;
    company: string;
    location?: string;
    startDate: Date;
    endDate?: Date;
    description?: string;
    highlights?: string[];
  }>;
  educations?: Array<{
    institution: string;
    degree: string;
    field?: string;
    startYear?: number;
    endYear?: number;
    gpa?: string;
    description?: string;
  }>;
  skills?: Array<{
    name: string;
    category?: string;
    level?: string;
    yearsOfExperience?: number;
  }>;
  languages?: Array<{
    language: string;
    proficiency: string;
  }>;
  certifications?: Array<{
    name: string;
    issuer?: string;
    date?: Date;
  }>;
}

/**
 * Anonymized profile structure
 */
interface AnonymizedProfile extends Omit<ProfileData, 'firstName' | 'lastName' | 'email' | 'phone' | 'location' | 'linkedInUrl' | 'websiteUrl' | 'photoUrl'> {
  anonymousId: string;
  firstName: string; // Will be "Candidate"
  lastName: string; // Will be the anonymous ID
  // Personal fields removed
}

/**
 * Service for anonymizing profile data
 * Helps prevent discrimination based on personal information (CNIL compliance)
 */
@Injectable()
export class AnonymizationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Anonymize a profile for use in job applications
   * Removes: name, photo, exact dates (age-revealing), address, contact info
   * Keeps: skills, experience duration, education level, professional summary
   */
  anonymizeProfile(profile: ProfileData): AnonymizedProfile {
    const anonymousId = this.generateAnonymousId();

    return {
      anonymousId,
      firstName: 'Candidate',
      lastName: anonymousId,
      // Personal contact info removed
      summary: this.anonymizeSummary(profile.summary),
      motivationText: this.anonymizeMotivation(profile.motivationText),
      workExperiences: this.anonymizeWorkExperiences(profile.workExperiences),
      educations: this.anonymizeEducations(profile.educations),
      skills: profile.skills, // Skills are kept as-is
      languages: profile.languages, // Languages are kept as-is
      certifications: this.anonymizeCertifications(profile.certifications),
    };
  }

  /**
   * Generate a unique anonymous identifier
   * Format: 4 random alphanumeric characters
   */
  private generateAnonymousId(): string {
    return uuidv4().substring(0, 8).toUpperCase();
  }

  /**
   * Anonymize professional summary
   * Remove any personal names or location mentions
   */
  private anonymizeSummary(summary?: string): string | undefined {
    if (!summary) return undefined;

    // Remove common patterns that might reveal identity
    let anonymized = summary;

    // Remove "I am [Name]" patterns
    anonymized = anonymized.replace(
      /\bI am\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)?\b/gi,
      'I am a professional',
    );

    // Remove "My name is [Name]" patterns
    anonymized = anonymized.replace(
      /\bMy name is\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)?\b/gi,
      '',
    );

    return anonymized.trim();
  }

  /**
   * Anonymize motivation text
   */
  private anonymizeMotivation(motivation?: string): string | undefined {
    if (!motivation) return undefined;

    // Similar anonymization as summary
    let anonymized = motivation;

    // Remove personal name mentions
    anonymized = anonymized.replace(
      /\bI am\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)?\b/gi,
      'I am a professional',
    );

    return anonymized.trim();
  }

  /**
   * Anonymize work experiences
   * - Keep: job titles, responsibilities, achievements, duration
   * - Remove: exact dates (convert to duration), specific company addresses
   */
  private anonymizeWorkExperiences(
    experiences?: ProfileData['workExperiences'],
  ): AnonymizedProfile['workExperiences'] {
    if (!experiences) return undefined;

    return experiences.map((exp) => ({
      title: exp.title,
      company: exp.company, // Keep company name for context
      location: this.anonymizeLocation(exp.location),
      startDate: this.anonymizeDate(exp.startDate),
      endDate: exp.endDate ? this.anonymizeDate(exp.endDate) : undefined,
      description: exp.description,
      highlights: exp.highlights,
    }));
  }

  /**
   * Anonymize education records
   * - Keep: degree level, field of study, duration
   * - Modify: use only graduation year (not full dates)
   */
  private anonymizeEducations(
    educations?: ProfileData['educations'],
  ): AnonymizedProfile['educations'] {
    if (!educations) return undefined;

    return educations.map((edu) => ({
      institution: edu.institution, // Keep for context
      degree: edu.degree,
      field: edu.field,
      // Keep only years, no specific dates
      startYear: edu.startYear,
      endYear: edu.endYear,
      gpa: undefined, // Remove GPA to prevent bias
      description: edu.description,
    }));
  }

  /**
   * Anonymize certifications
   * - Keep: certification name, issuer
   * - Remove: exact dates (just show year)
   */
  private anonymizeCertifications(
    certifications?: ProfileData['certifications'],
  ): AnonymizedProfile['certifications'] {
    if (!certifications) return undefined;

    return certifications.map((cert) => ({
      name: cert.name,
      issuer: cert.issuer,
      date: cert.date ? this.anonymizeDate(cert.date) : undefined,
    }));
  }

  /**
   * Anonymize a location to just city/region level
   */
  private anonymizeLocation(location?: string): string | undefined {
    if (!location) return undefined;

    // Extract just the city or region (remove street addresses)
    const parts = location.split(',').map((p) => p.trim());

    // Return just the last 1-2 parts (typically city, country)
    if (parts.length >= 2) {
      return parts.slice(-2).join(', ');
    }

    return location;
  }

  /**
   * Anonymize a date to just year-month (no day)
   * This helps prevent age discrimination while maintaining timeline
   */
  private anonymizeDate(date: Date): Date {
    const anonymized = new Date(date);
    anonymized.setDate(1); // Set to first of month
    return anonymized;
  }

  /**
   * Check if a profile should be anonymized based on campaign settings
   */
  async shouldAnonymize(campaignId: string): Promise<boolean> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { anonymizeApplications: true },
    });

    return campaign?.anonymizeApplications ?? false;
  }

  /**
   * Get anonymized profile for a user if campaign requires it
   */
  async getProfileForApplication(
    userId: string,
    campaignId: string,
  ): Promise<ProfileData | AnonymizedProfile> {
    const profile = await this.prisma.profile.findFirst({
      where: { userId },
      include: {
        workExperiences: { orderBy: { startDate: 'desc' } },
        educations: { orderBy: { startDate: 'desc' } },
        skills: true,
        languages: true,
        certifications: { orderBy: { issueDate: 'desc' } },
      },
    });

    if (!profile) {
      throw new Error('Profile not found');
    }

    const shouldAnonymize = await this.shouldAnonymize(campaignId);

    if (shouldAnonymize) {
      return this.anonymizeProfile(profile as unknown as ProfileData);
    }

    return profile as unknown as ProfileData;
  }
}

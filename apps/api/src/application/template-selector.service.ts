import { Injectable, Logger } from '@nestjs/common';
import {
  CV_TEMPLATES,
  CVTemplateId,
  COVER_LETTER_TEMPLATES,
  CoverLetterTemplateId,
} from './templates/template-config';

// Define the JobUnderstanding interface locally to avoid circular dependency issues
interface JobUnderstanding {
  roleCategory: string;
  seniorityLevel: string;
  industryDomain: string;
  companySize: string | null;
  companyCulture: string[];
  companyValues: string[];
  mustHaveSkills: string[];
  niceToHaveSkills: string[];
  softSkillsRequired: string[];
  postingTone: string;
  expectedCommunicationStyle: string;
  keySellingPoints: string[];
  potentialConcerns: string[];
  uniqueHooks: string[];
}

@Injectable()
export class TemplateSelectorService {
  private readonly logger = new Logger(TemplateSelectorService.name);

  /**
   * Select the best CV template based on job understanding and user preference
   */
  selectCVTemplate(
    jobUnderstanding: JobUnderstanding | null,
    userPreference?: CVTemplateId | null,
  ): CVTemplateId {
    // If user has preference, respect it
    if (userPreference && userPreference in CV_TEMPLATES) {
      this.logger.debug(`Using user-preferred template: ${userPreference}`);
      return userPreference;
    }

    // If no job understanding, default to professional
    if (!jobUnderstanding) {
      return 'professional';
    }

    const roleCategory = jobUnderstanding.roleCategory;
    const companySize = jobUnderstanding.companySize;
    const postingTone = jobUnderstanding.postingTone;

    // Creative roles -> creative template
    if (['design', 'marketing', 'creative'].includes(roleCategory)) {
      this.logger.debug(`Selected creative template for ${roleCategory} role`);
      return 'creative';
    }

    // Tech startups -> modern template
    if (roleCategory === 'engineering' && companySize === 'startup') {
      this.logger.debug('Selected modern template for engineering at startup');
      return 'modern';
    }

    // Casual tone at any tech company -> modern
    if (postingTone === 'casual' || postingTone === 'technical') {
      this.logger.debug(`Selected modern template for ${postingTone} tone`);
      return 'modern';
    }

    // Finance, legal, executive -> professional template
    if (['finance', 'legal', 'executive'].includes(roleCategory)) {
      this.logger.debug(`Selected professional template for ${roleCategory} role`);
      return 'professional';
    }

    // Enterprise companies -> professional
    if (companySize === 'enterprise') {
      this.logger.debug('Selected professional template for enterprise company');
      return 'professional';
    }

    // Default to professional
    this.logger.debug('Defaulting to professional template');
    return 'professional';
  }

  /**
   * Select the best cover letter template based on job understanding
   */
  selectCoverLetterTemplate(
    jobUnderstanding: JobUnderstanding | null,
    userPreference?: CoverLetterTemplateId | null,
  ): CoverLetterTemplateId {
    if (userPreference && userPreference in COVER_LETTER_TEMPLATES) {
      return userPreference;
    }

    if (!jobUnderstanding) {
      return 'classic';
    }

    const { postingTone, expectedCommunicationStyle } = jobUnderstanding;

    // Formal or corporate -> classic
    if (postingTone === 'formal' || postingTone === 'corporate') {
      return 'classic';
    }

    // Casual, technical, or creative -> modern
    if (['casual', 'technical', 'creative'].includes(postingTone)) {
      return 'modern';
    }

    // Formal communication style -> classic
    if (expectedCommunicationStyle === 'formal') {
      return 'classic';
    }

    return 'classic';
  }

  /**
   * Validate that the selected template matches the content tone
   */
  validateTemplateContentMatch(
    templateId: CVTemplateId,
    jobUnderstanding: JobUnderstanding | null,
  ): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    if (!jobUnderstanding) {
      return { isValid: true, warnings };
    }

    const template = CV_TEMPLATES[templateId];
    const { postingTone, roleCategory, companySize } = jobUnderstanding;

    // Check tone alignment
    if (postingTone === 'creative' && templateId === 'professional') {
      warnings.push(
        'Creative role with conservative template - consider "creative" template for better impression',
      );
    }

    if (postingTone === 'formal' && templateId === 'creative') {
      warnings.push(
        'Formal role with creative template - may appear unprofessional for this audience',
      );
    }

    // Check industry alignment
    const suitableForArray = template.suitableFor as readonly string[];
    if (
      !suitableForArray.includes('all') &&
      !suitableForArray.includes(roleCategory) &&
      !suitableForArray.includes(companySize || '')
    ) {
      warnings.push(
        `Template "${templateId}" may not be optimal for ${roleCategory} roles`,
      );
    }

    return {
      isValid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Get content length limits for a template
   */
  getTemplateLimits(templateId: CVTemplateId): {
    summaryMaxLength: number;
    experienceHighlightsMax: number;
    skillsMax: number;
  } {
    const limits: Record<
      CVTemplateId,
      { summaryMaxLength: number; experienceHighlightsMax: number; skillsMax: number }
    > = {
      professional: { summaryMaxLength: 400, experienceHighlightsMax: 5, skillsMax: 15 },
      modern: { summaryMaxLength: 350, experienceHighlightsMax: 4, skillsMax: 12 },
      creative: { summaryMaxLength: 300, experienceHighlightsMax: 4, skillsMax: 10 },
      minimal: { summaryMaxLength: 500, experienceHighlightsMax: 6, skillsMax: 20 },
    };

    return limits[templateId];
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { CV_TEMPLATES, CVTemplateId } from './templates/template-config';
import { GeneratedCVContent } from './pdf-generator.service';

/**
 * Canva-compatible template element
 */
interface CanvaElement {
  type: 'text' | 'rectangle' | 'line';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  color?: string;
  backgroundColor?: string;
  maxWidth?: number;
  textAlign?: 'left' | 'center' | 'right';
}

/**
 * Canva-compatible template structure
 */
export interface CanvaTemplate {
  version: string;
  design: {
    width: number;
    height: number;
    backgroundColor: string;
  };
  metadata: {
    name: string;
    candidateName: string;
    generatedAt: string;
  };
  elements: CanvaElement[];
}

@Injectable()
export class CanvaExportService {
  private readonly logger = new Logger(CanvaExportService.name);

  // A4 dimensions in points (595 x 842)
  private readonly PAGE_WIDTH = 595;
  private readonly PAGE_HEIGHT = 842;
  private readonly MARGIN = 40;
  private readonly CONTENT_WIDTH = 515; // PAGE_WIDTH - 2 * MARGIN

  /**
   * Generate a Canva-compatible JSON template from CV content
   */
  generateCanvaTemplate(
    cv: GeneratedCVContent,
    templateId: CVTemplateId = 'professional',
  ): CanvaTemplate {
    const config = CV_TEMPLATES[templateId];
    const elements: CanvaElement[] = [];
    let currentY = this.MARGIN;

    // Header section
    currentY = this.addHeader(elements, cv, config, currentY);
    currentY += 20;

    // Summary section
    if (cv.summary) {
      currentY = this.addSection(elements, 'PROFESSIONAL SUMMARY', config.accentColor, currentY);
      currentY = this.addText(elements, cv.summary, currentY, {
        fontSize: 10,
        color: '#333333',
        maxWidth: this.CONTENT_WIDTH,
      });
      currentY += 20;
    }

    // Work Experience section
    if (cv.workExperience.length > 0) {
      currentY = this.addSection(elements, 'WORK EXPERIENCE', config.accentColor, currentY);
      for (const exp of cv.workExperience) {
        currentY = this.addExperience(elements, exp, config, currentY);
      }
      currentY += 10;
    }

    // Education section
    if (cv.education.length > 0) {
      currentY = this.addSection(elements, 'EDUCATION', config.accentColor, currentY);
      for (const edu of cv.education) {
        currentY = this.addEducation(elements, edu, currentY);
      }
      currentY += 10;
    }

    // Skills section
    if (cv.skills.length > 0) {
      currentY = this.addSection(elements, 'SKILLS', config.accentColor, currentY);
      currentY = this.addText(elements, cv.skills.join('  |  '), currentY, {
        fontSize: 10,
        color: '#333333',
        maxWidth: this.CONTENT_WIDTH,
      });
      currentY += 10;
    }

    // Languages section
    if (cv.languages.length > 0) {
      currentY = this.addSection(elements, 'LANGUAGES', config.accentColor, currentY);
      const languageText = cv.languages
        .map((l) => `${l.name} (${l.proficiency})`)
        .join('  |  ');
      currentY = this.addText(elements, languageText, currentY, {
        fontSize: 10,
        color: '#333333',
      });
    }

    return {
      version: '1.0',
      design: {
        width: this.PAGE_WIDTH,
        height: this.PAGE_HEIGHT,
        backgroundColor: '#ffffff',
      },
      metadata: {
        name: `CV - ${cv.personalInfo.firstName} ${cv.personalInfo.lastName}`,
        candidateName: `${cv.personalInfo.firstName} ${cv.personalInfo.lastName}`,
        generatedAt: new Date().toISOString(),
      },
      elements,
    };
  }

  /**
   * Add header section with name and contact info
   */
  private addHeader(
    elements: CanvaElement[],
    cv: GeneratedCVContent,
    config: (typeof CV_TEMPLATES)[CVTemplateId],
    startY: number,
  ): number {
    let y = startY;

    // Name
    elements.push({
      type: 'text',
      x: this.MARGIN,
      y,
      text: `${cv.personalInfo.firstName} ${cv.personalInfo.lastName}`,
      fontSize: 28,
      fontFamily: config.font,
      fontWeight: 'bold',
      color: config.accentColor,
    });
    y += 35;

    // Contact info line
    const contactParts: string[] = [];
    if (cv.personalInfo.email) contactParts.push(cv.personalInfo.email);
    if (cv.personalInfo.phone) contactParts.push(cv.personalInfo.phone);
    if (cv.personalInfo.location) contactParts.push(cv.personalInfo.location);

    if (contactParts.length > 0) {
      elements.push({
        type: 'text',
        x: this.MARGIN,
        y,
        text: contactParts.join('  |  '),
        fontSize: 10,
        fontFamily: config.font,
        color: '#666666',
      });
      y += 15;
    }

    // LinkedIn
    if (cv.personalInfo.linkedIn) {
      elements.push({
        type: 'text',
        x: this.MARGIN,
        y,
        text: cv.personalInfo.linkedIn,
        fontSize: 10,
        fontFamily: config.font,
        color: config.accentColor,
      });
      y += 15;
    }

    // Header line
    elements.push({
      type: 'line',
      x: this.MARGIN,
      y: y + 5,
      width: this.CONTENT_WIDTH,
      height: 2,
      backgroundColor: config.accentColor,
    });

    return y + 15;
  }

  /**
   * Add a section title
   */
  private addSection(
    elements: CanvaElement[],
    title: string,
    accentColor: string,
    startY: number,
  ): number {
    elements.push({
      type: 'text',
      x: this.MARGIN,
      y: startY,
      text: title,
      fontSize: 12,
      fontWeight: 'bold',
      color: accentColor,
    });

    elements.push({
      type: 'line',
      x: this.MARGIN,
      y: startY + 16,
      width: this.CONTENT_WIDTH,
      height: 1,
      backgroundColor: '#e5e7eb',
    });

    return startY + 25;
  }

  /**
   * Add work experience entry
   */
  private addExperience(
    elements: CanvaElement[],
    exp: GeneratedCVContent['workExperience'][0],
    config: (typeof CV_TEMPLATES)[CVTemplateId],
    startY: number,
  ): number {
    let y = startY;

    // Job title
    elements.push({
      type: 'text',
      x: this.MARGIN,
      y,
      text: exp.title,
      fontSize: 11,
      fontWeight: 'bold',
      color: '#1f2937',
    });

    // Dates (right-aligned)
    const dateText = `${exp.startDate} - ${exp.endDate || 'Present'}`;
    elements.push({
      type: 'text',
      x: this.PAGE_WIDTH - this.MARGIN - 100,
      y,
      text: dateText,
      fontSize: 10,
      color: '#6b7280',
      textAlign: 'right',
    });
    y += 15;

    // Company
    elements.push({
      type: 'text',
      x: this.MARGIN,
      y,
      text: exp.company + (exp.location ? ` - ${exp.location}` : ''),
      fontSize: 10,
      fontStyle: 'italic',
      color: '#4b5563',
    });
    y += 15;

    // Highlights
    for (const highlight of exp.highlights.slice(0, 4)) {
      elements.push({
        type: 'text',
        x: this.MARGIN + 15,
        y,
        text: `• ${highlight}`,
        fontSize: 10,
        color: '#4b5563',
        maxWidth: this.CONTENT_WIDTH - 15,
      });
      y += 14;
    }

    return y + 10;
  }

  /**
   * Add education entry
   */
  private addEducation(
    elements: CanvaElement[],
    edu: GeneratedCVContent['education'][0],
    startY: number,
  ): number {
    let y = startY;

    // Degree
    const degreeText = edu.field ? `${edu.degree} in ${edu.field}` : edu.degree;
    elements.push({
      type: 'text',
      x: this.MARGIN,
      y,
      text: degreeText,
      fontSize: 11,
      fontWeight: 'bold',
      color: '#1f2937',
    });
    y += 15;

    // Institution and date
    const instText = edu.endDate ? `${edu.institution}, ${edu.endDate}` : edu.institution;
    elements.push({
      type: 'text',
      x: this.MARGIN,
      y,
      text: instText,
      fontSize: 10,
      color: '#4b5563',
    });
    y += 18;

    return y;
  }

  /**
   * Add text element
   */
  private addText(
    elements: CanvaElement[],
    text: string,
    startY: number,
    options: Partial<CanvaElement>,
  ): number {
    elements.push({
      type: 'text',
      x: this.MARGIN,
      y: startY,
      text,
      ...options,
    });

    // Estimate height based on text length and width
    const estimatedLines = options.maxWidth
      ? Math.ceil(text.length / (options.maxWidth / 6))
      : 1;
    const lineHeight = (options.fontSize || 10) * 1.4;

    return startY + estimatedLines * lineHeight;
  }
}

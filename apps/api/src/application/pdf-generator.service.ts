import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Generated CV content structure
 */
export interface GeneratedCVContent {
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    location: string | null;
    linkedIn: string | null;
  };
  summary: string;
  workExperience: Array<{
    company: string;
    title: string;
    location: string | null;
    startDate: string;
    endDate: string | null;
    highlights: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string | null;
    endDate: string | null;
  }>;
  skills: string[];
  languages: Array<{
    name: string;
    proficiency: string;
  }>;
}

/**
 * Generated cover letter content structure
 */
export interface GeneratedCoverLetterContent {
  recipientName: string | null;
  recipientTitle: string | null;
  companyName: string;
  opening: string;
  body: string[];
  closing: string;
  signature: string;
}

/**
 * Context for rendering cover letter with additional sender info
 */
interface CoverLetterRenderContext extends GeneratedCoverLetterContent {
  senderName: string;
  senderEmail?: string;
  senderPhone?: string;
  senderLocation?: string;
  date: string;
}

@Injectable()
export class PdfGeneratorService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfGeneratorService.name);
  private browser: puppeteer.Browser | null = null;
  private browserPromise: Promise<puppeteer.Browser> | null = null;

  private readonly templatesDir = path.join(__dirname, 'templates');

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Get or launch browser instance (lazy initialization)
   */
  private async getBrowser(): Promise<puppeteer.Browser> {
    if (this.browser) {
      return this.browser;
    }

    if (this.browserPromise) {
      return this.browserPromise;
    }

    this.browserPromise = puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    });

    this.browser = await this.browserPromise;
    this.browserPromise = null;

    this.logger.log('Puppeteer browser launched');
    return this.browser;
  }

  /**
   * Generate PDF from CV content
   */
  async generateCVPdf(content: GeneratedCVContent): Promise<Buffer> {
    const templatePath = path.join(this.templatesDir, 'cv-template.html');
    const template = await fs.readFile(templatePath, 'utf-8');

    const html = this.renderTemplate(template, content as unknown as Record<string, unknown>);
    return this.htmlToPdf(html);
  }

  /**
   * Generate PDF from cover letter content
   */
  async generateCoverLetterPdf(
    content: GeneratedCoverLetterContent,
    senderInfo: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      location?: string;
    },
  ): Promise<Buffer> {
    const templatePath = path.join(this.templatesDir, 'cover-letter-template.html');
    const template = await fs.readFile(templatePath, 'utf-8');

    const context: CoverLetterRenderContext = {
      ...content,
      senderName: `${senderInfo.firstName} ${senderInfo.lastName}`,
      senderEmail: senderInfo.email,
      senderPhone: senderInfo.phone,
      senderLocation: senderInfo.location,
      date: this.formatDate(new Date()),
    };

    const html = this.renderTemplate(template, context as unknown as Record<string, unknown>);
    return this.htmlToPdf(html);
  }

  /**
   * Convert HTML to PDF using Puppeteer
   */
  private async htmlToPdf(html: string): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setContent(html, {
        waitUntil: 'networkidle0',
      });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0',
        },
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }

  /**
   * Simple template renderer (Handlebars-like syntax)
   */
  private renderTemplate(template: string, context: Record<string, unknown>): string {
    let result = template;

    // Handle {{#if condition}} blocks
    result = this.processIfBlocks(result, context);

    // Handle {{#each array}} blocks
    result = this.processEachBlocks(result, context);

    // Handle simple {{variable}} substitutions
    result = this.processVariables(result, context);

    return result;
  }

  /**
   * Process {{#if}} blocks
   */
  private processIfBlocks(template: string, context: Record<string, unknown>): string {
    const ifRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

    return template.replace(ifRegex, (_, condition, content) => {
      const value = this.getNestedValue(context, condition.trim());
      const isTruthy = Array.isArray(value) ? value.length > 0 : Boolean(value);
      return isTruthy ? content : '';
    });
  }

  /**
   * Process {{#each}} blocks
   */
  private processEachBlocks(template: string, context: Record<string, unknown>): string {
    const eachRegex = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

    return template.replace(eachRegex, (_, arrayPath, itemTemplate) => {
      const array = this.getNestedValue(context, arrayPath.trim());

      if (!Array.isArray(array)) {
        return '';
      }

      return array
        .map((item) => {
          // Replace {{this}} with the item value (for simple arrays)
          let itemHtml = itemTemplate.replace(/\{\{this\}\}/g, String(item));

          // Process nested {{property}} for objects
          if (typeof item === 'object' && item !== null) {
            itemHtml = this.processVariables(itemHtml, item);
            itemHtml = this.processIfBlocks(itemHtml, item);
          }

          return itemHtml;
        })
        .join('');
    });
  }

  /**
   * Process {{variable}} substitutions
   */
  private processVariables(template: string, context: Record<string, unknown>): string {
    const varRegex = /\{\{([^#/][^}]*)\}\}/g;

    return template.replace(varRegex, (_, path) => {
      const value = this.getNestedValue(context, path.trim());
      return value !== null && value !== undefined ? this.escapeHtml(String(value)) : '';
    });
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => escapeMap[char] || char);
  }

  /**
   * Format date for cover letter
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}

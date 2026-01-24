import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

@Injectable()
export class OpenAIService implements OnModuleInit {
  private client: OpenAI;
  private visionModel: string;
  private chatModel: string;
  private embeddingModel: string;

  constructor(private readonly configService: ConfigService) {
    this.visionModel =
      this.configService.get<string>('OPENAI_VISION_MODEL') || 'gpt-4o';
    this.chatModel =
      this.configService.get<string>('OPENAI_CHAT_MODEL') || 'gpt-4o';
    this.embeddingModel =
      this.configService.get<string>('OPENAI_EMBEDDING_MODEL') ||
      'text-embedding-3-small';
  }

  onModuleInit() {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      console.warn('OPENAI_API_KEY not configured');
    }

    this.client = new OpenAI({
      apiKey: apiKey || 'dummy-key',
    });
  }

  /**
   * Parse CV images using Vision API with structured output
   */
  async parseCV<T extends z.ZodType>(
    images: Buffer[],
    schema: T,
    schemaName: string,
  ): Promise<z.infer<T>> {
    const imageContents = images.map((img) => ({
      type: 'image_url' as const,
      image_url: {
        url: `data:image/png;base64,${img.toString('base64')}`,
        detail: 'high' as const,
      },
    }));

    const response = await this.client.beta.chat.completions.parse({
      model: this.visionModel,
      messages: [
        {
          role: 'system',
          content: `You are a professional CV/resume parser. Extract all information from the provided resume image(s) into a structured format.
Be thorough and extract:
- Personal information (name, email, phone, location, LinkedIn, website)
- Professional summary
- Work experience (company, title, dates, description, key achievements)
- Education (institution, degree, field, dates)
- Skills (name, category, proficiency level)
- Languages (name, proficiency)
- Certifications (name, issuer, date)

If information is unclear or missing, use null. For dates, use YYYY-MM format when possible.
Provide a confidence score (0-100) for the overall extraction quality.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please extract all information from this resume:',
            },
            ...imageContents,
          ],
        },
      ],
      response_format: zodResponseFormat(schema, schemaName),
      max_tokens: 4096,
    });

    const parsed = response.choices[0]?.message?.parsed;
    if (!parsed) {
      throw new Error('Failed to parse CV: No structured output returned');
    }

    return parsed;
  }

  /**
   * Analyze job offer and match against profile
   */
  async analyzeJobMatch<T extends z.ZodType>(
    jobOffer: {
      title: string;
      company: string;
      description: string;
      requirements: string[];
    },
    profile: {
      summary: string;
      skills: string[];
      experience: { title: string; company: string; description: string }[];
      education: { degree: string; field: string }[];
    },
    schema: T,
    schemaName: string,
  ): Promise<z.infer<T>> {
    const response = await this.client.beta.chat.completions.parse({
      model: this.chatModel,
      messages: [
        {
          role: 'system',
          content: `You are a professional job matching assistant. Analyze the job offer against the candidate profile and provide a detailed match analysis.

Score the match from 0-100 based on:
- Skills match (40% weight)
- Experience match (30% weight)
- Education match (15% weight)
- Location/other factors (15% weight)

Be realistic and objective. A score of 70+ indicates a good match. Below 50 is a weak match.`,
        },
        {
          role: 'user',
          content: `Analyze this job match:

JOB OFFER:
Title: ${jobOffer.title}
Company: ${jobOffer.company}
Description: ${jobOffer.description}
Requirements: ${jobOffer.requirements.join(', ')}

CANDIDATE PROFILE:
Summary: ${profile.summary}
Skills: ${profile.skills.join(', ')}
Experience: ${profile.experience.map((e) => `${e.title} at ${e.company}: ${e.description}`).join('\n')}
Education: ${profile.education.map((e) => `${e.degree} in ${e.field}`).join(', ')}`,
        },
      ],
      response_format: zodResponseFormat(schema, schemaName),
      max_tokens: 2048,
    });

    const parsed = response.choices[0]?.message?.parsed;
    if (!parsed) {
      throw new Error('Failed to analyze job match');
    }

    return parsed;
  }

  /**
   * Generate customized CV content
   */
  async generateCV<T extends z.ZodType>(
    profile: Record<string, unknown>,
    jobOffer: { title: string; company: string; requirements: string[] },
    schema: T,
    schemaName: string,
  ): Promise<z.infer<T>> {
    const response = await this.client.beta.chat.completions.parse({
      model: this.chatModel,
      messages: [
        {
          role: 'system',
          content: `You are a professional CV writer. Create a tailored CV based on the candidate's profile, optimized for the target job.

Guidelines:
- Emphasize relevant experience and skills
- Reorder skills by relevance to the job
- Craft a summary that aligns with the role
- Keep work experience highlights focused on relevant achievements
- Be truthful - don't fabricate information
- Use action verbs and quantify achievements where possible`,
        },
        {
          role: 'user',
          content: `Create a tailored CV for this job application:

TARGET JOB:
Title: ${jobOffer.title}
Company: ${jobOffer.company}
Key Requirements: ${jobOffer.requirements.join(', ')}

CANDIDATE PROFILE:
${JSON.stringify(profile, null, 2)}`,
        },
      ],
      response_format: zodResponseFormat(schema, schemaName),
      max_tokens: 4096,
    });

    const parsed = response.choices[0]?.message?.parsed;
    if (!parsed) {
      throw new Error('Failed to generate CV');
    }

    return parsed;
  }

  /**
   * Generate cover letter
   */
  async generateCoverLetter<T extends z.ZodType>(
    profile: { firstName: string; lastName: string; summary: string; motivationText?: string },
    jobOffer: { title: string; company: string; description: string },
    schema: T,
    schemaName: string,
  ): Promise<z.infer<T>> {
    const response = await this.client.beta.chat.completions.parse({
      model: this.chatModel,
      messages: [
        {
          role: 'system',
          content: `You are a professional cover letter writer. Create a compelling, personalized cover letter.

Guidelines:
- Professional but personable tone
- Show genuine interest in the company
- Highlight relevant experience and skills
- Keep it concise (3-4 paragraphs)
- End with a clear call to action`,
        },
        {
          role: 'user',
          content: `Write a cover letter:

CANDIDATE:
Name: ${profile.firstName} ${profile.lastName}
Summary: ${profile.summary}
${profile.motivationText ? `Personal motivation: ${profile.motivationText}` : ''}

TARGET JOB:
Title: ${jobOffer.title}
Company: ${jobOffer.company}
Description: ${jobOffer.description}`,
        },
      ],
      response_format: zodResponseFormat(schema, schemaName),
      max_tokens: 2048,
    });

    const parsed = response.choices[0]?.message?.parsed;
    if (!parsed) {
      throw new Error('Failed to generate cover letter');
    }

    return parsed;
  }

  /**
   * Generate embedding vector for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.embeddingModel,
      input: text,
    });

    return response.data[0]?.embedding || [];
  }

  /**
   * Chat completion (for general purposes)
   */
  async chat(
    systemPrompt: string,
    userMessage: string,
    options?: { maxTokens?: number },
  ): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.chatModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: options?.maxTokens || 1024,
    });

    return response.choices[0]?.message?.content || '';
  }
}

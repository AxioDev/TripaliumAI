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

Be realistic and objective. A score of 70+ indicates a good match. Below 50 is a weak match.

IMPORTANT - DISCRIMINATION SCREENING (French/EU Law Compliance):
You MUST also screen the job posting for potentially discriminatory requirements. Under French and EU employment law, employers cannot discriminate based on:
- Age (e.g., "max 35 years old", "young dynamic team", "recent graduate only")
- Gender (e.g., "female only", "looking for a man")
- Origin/Nationality (e.g., "French nationals only", "EU citizens only" unless legally required)
- Physical appearance (e.g., "attractive", "good presentation required" when not job-relevant)
- Family status (e.g., "no children", "single preferred", "available evenings")
- Religion (e.g., religious requirements unless for religious organizations)
- Health/Disability (e.g., "must be in perfect health" unless genuinely job-relevant)

Flag any discriminatory requirements found in the posting. Include the specific problematic text in discriminationDetails.`,
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
   * Generate customized CV content (basic version without job understanding)
   */
  async generateCV<T extends z.ZodType>(
    profile: Record<string, unknown>,
    jobOffer: { title: string; company: string; requirements: string[] },
    schema: T,
    schemaName: string,
  ): Promise<z.infer<T>> {
    // Use basic generation without deep job understanding
    return this.generateCVWithContext(profile, jobOffer, null, schema, schemaName);
  }

  /**
   * Generate customized CV content with deep job understanding context
   */
  async generateCVWithContext<T extends z.ZodType>(
    profile: Record<string, unknown>,
    jobOffer: { title: string; company: string; description?: string; requirements: string[] },
    jobUnderstanding: {
      roleCategory: string;
      seniorityLevel: string;
      industryDomain: string;
      companyCulture: string[];
      companyValues: string[];
      mustHaveSkills: string[];
      niceToHaveSkills: string[];
      softSkillsRequired: string[];
      postingTone: string;
      keySellingPoints: string[];
      uniqueHooks: string[];
    } | null,
    schema: T,
    schemaName: string,
  ): Promise<z.infer<T>> {
    let systemPrompt: string;

    if (jobUnderstanding) {
      // Enhanced prompt with deep job understanding
      systemPrompt = `You are an expert CV writer who creates highly tailored resumes that feel personally written for each specific opportunity.

CONTEXT FOR THIS APPLICATION:
- Role: ${jobUnderstanding.roleCategory} at ${jobUnderstanding.seniorityLevel} level
- Industry: ${jobUnderstanding.industryDomain}
- Company culture: ${jobUnderstanding.companyCulture.join(', ')}
- Company values: ${jobUnderstanding.companyValues.join(', ')}
- Expected tone: ${jobUnderstanding.postingTone}
- Key selling points to emphasize: ${jobUnderstanding.keySellingPoints.join(', ')}
- Must-have skills to highlight: ${jobUnderstanding.mustHaveSkills.join(', ')}
- Nice-to-have skills: ${jobUnderstanding.niceToHaveSkills.join(', ')}
- Soft skills they value: ${jobUnderstanding.softSkillsRequired.join(', ')}

PERSONALIZATION REQUIREMENTS:

1. SUMMARY: Write specifically for this ${jobUnderstanding.roleCategory} role at ${jobOffer.company}
   - Mirror language from the job posting where natural
   - Address their specific needs: ${jobUnderstanding.uniqueHooks.slice(0, 3).join(', ')}
   - Show understanding of their ${jobUnderstanding.industryDomain} context

2. EXPERIENCE: Select and reframe experience to match their priorities
   - Emphasize achievements relevant to: ${jobUnderstanding.mustHaveSkills.slice(0, 5).join(', ')}
   - Use terminology that resonates with ${jobUnderstanding.industryDomain} industry
   - Highlight quantifiable results that demonstrate relevant capabilities
   - Focus on ${jobUnderstanding.seniorityLevel}-level responsibilities and impact

3. SKILLS: Order by direct relevance to this specific posting
   - Lead with: ${jobUnderstanding.mustHaveSkills.slice(0, 5).join(', ')}
   - Include soft skills they value: ${jobUnderstanding.softSkillsRequired.join(', ')}

4. TONE: Match the ${jobUnderstanding.postingTone} style of their posting

CRITICAL RULES:
- This CV must feel written specifically for ${jobOffer.company}'s ${jobOffer.title} role
- A generic CV that could apply to any similar role is a FAILURE
- Be truthful - don't fabricate information, but DO emphasize and reframe existing experience
- Use action verbs and quantify achievements where possible
- The summary should NOT start with "I am" or use first person excessively`;
    } else {
      // Basic prompt without job understanding
      systemPrompt = `You are a professional CV writer. Create a tailored CV based on the candidate's profile, optimized for the target job.

Guidelines:
- Emphasize relevant experience and skills
- Reorder skills by relevance to the job
- Craft a summary that aligns with the role
- Keep work experience highlights focused on relevant achievements
- Be truthful - don't fabricate information
- Use action verbs and quantify achievements where possible
- The summary should NOT start with "I am" or use first person excessively`;
    }

    const response = await this.client.beta.chat.completions.parse({
      model: this.chatModel,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Create a tailored CV for this job application:

TARGET JOB:
Title: ${jobOffer.title}
Company: ${jobOffer.company}
Key Requirements: ${jobOffer.requirements.join(', ')}
${jobOffer.description ? `\nJob Description:\n${jobOffer.description.slice(0, 2000)}` : ''}

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
   * Generate cover letter (basic version without job understanding)
   */
  async generateCoverLetter<T extends z.ZodType>(
    profile: { firstName: string; lastName: string; summary: string; motivationText?: string },
    jobOffer: { title: string; company: string; description: string },
    schema: T,
    schemaName: string,
  ): Promise<z.infer<T>> {
    return this.generateCoverLetterWithContext(profile, jobOffer, null, null, schema, schemaName);
  }

  /**
   * Generate cover letter with deep job understanding and candidate highlights
   */
  async generateCoverLetterWithContext<T extends z.ZodType>(
    profile: { firstName: string; lastName: string; summary: string; motivationText?: string },
    jobOffer: { title: string; company: string; description: string },
    jobUnderstanding: {
      roleCategory: string;
      seniorityLevel: string;
      industryDomain: string;
      companyCulture: string[];
      companyValues: string[];
      mustHaveSkills: string[];
      softSkillsRequired: string[];
      postingTone: string;
      expectedCommunicationStyle: string;
      keySellingPoints: string[];
      uniqueHooks: string[];
    } | null,
    candidateHighlights: {
      relevantAchievements: string[];
      matchingSkills: string[];
    } | null,
    schema: T,
    schemaName: string,
  ): Promise<z.infer<T>> {
    let systemPrompt: string;

    if (jobUnderstanding) {
      systemPrompt = `You are an expert cover letter writer creating a letter for a specific opportunity.

THIS IS NOT A TEMPLATE. Write specifically for ${jobOffer.company}'s ${jobOffer.title} position.

CONTEXT:
- Role: ${jobUnderstanding.roleCategory} at ${jobUnderstanding.seniorityLevel} level
- Industry: ${jobUnderstanding.industryDomain}
- Company culture: ${jobUnderstanding.companyCulture.join(', ')}
- Values they emphasize: ${jobUnderstanding.companyValues.join(', ')}
- Communication style expected: ${jobUnderstanding.expectedCommunicationStyle}
- Key things to address: ${jobUnderstanding.keySellingPoints.join(', ')}
- Skills they need: ${jobUnderstanding.mustHaveSkills.slice(0, 5).join(', ')}
- Soft skills valued: ${jobUnderstanding.softSkillsRequired.join(', ')}

${candidateHighlights ? `CANDIDATE'S RELEVANT STRENGTHS:
${candidateHighlights.relevantAchievements.map((a) => `- ${a}`).join('\n')}
Matching skills: ${candidateHighlights.matchingSkills.join(', ')}` : ''}

WRITING REQUIREMENTS:

1. OPENING: Hook them with a specific reason you want THIS role at THIS company
   - Reference something specific about ${jobOffer.company}
   - Show you understand their ${jobUnderstanding.industryDomain} context
   - DO NOT start with "I am writing to apply for..." or similar generic phrases

2. BODY (2-3 paragraphs): Connect experience to THEIR specific needs
   - Address: ${jobUnderstanding.uniqueHooks.slice(0, 3).join(', ')}
   - Use specific achievements that demonstrate: ${jobUnderstanding.mustHaveSkills.slice(0, 3).join(', ')}
   - Mirror their language and values where natural

3. CLOSING: Clear, confident call to action matching their ${jobUnderstanding.expectedCommunicationStyle} style

TONE: ${jobUnderstanding.postingTone} - match their communication style exactly.

FORBIDDEN PHRASES (never use these):
- "I am writing to apply for..."
- "I believe I would be a great fit..."
- "I am excited about this opportunity..."
- "I am confident that..."
- "Proven track record..."
- Any generic phrase that could apply to any company`;
    } else {
      systemPrompt = `You are a professional cover letter writer. Create a compelling, personalized cover letter.

Guidelines:
- Professional but personable tone
- Show genuine interest in the company
- Highlight relevant experience and skills
- Keep it concise (3-4 paragraphs)
- End with a clear call to action
- DO NOT start with "I am writing to apply for..." or similar generic phrases
- Avoid cliches like "I believe I would be a great fit" or "proven track record"`;
    }

    const response = await this.client.beta.chat.completions.parse({
      model: this.chatModel,
      messages: [
        { role: 'system', content: systemPrompt },
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

  /**
   * Generic structured output analysis with any schema
   */
  async analyzeWithSchema<T extends z.ZodType>(
    systemPrompt: string,
    userPrompt: string,
    schema: T,
    schemaName: string,
    options?: { maxTokens?: number },
  ): Promise<z.infer<T>> {
    const response = await this.client.beta.chat.completions.parse({
      model: this.chatModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: zodResponseFormat(schema, schemaName),
      max_tokens: options?.maxTokens || 2048,
    });

    const parsed = response.choices[0]?.message?.parsed;
    if (!parsed) {
      throw new Error(`Failed to analyze with schema ${schemaName}`);
    }

    return parsed;
  }
}

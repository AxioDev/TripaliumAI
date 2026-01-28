import { Injectable, Logger } from '@nestjs/common';
import { OpenAIService } from '../llm/openai.service';
import { jobUnderstandingSchema } from '@tripalium/shared';

// Define the interface locally to avoid build order issues
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

interface JobOfferInput {
  title: string;
  company: string;
  description: string;
  requirements: string[];
  location?: string | null;
  salary?: string | null;
  contractType?: string | null;
  remoteType?: string | null;
}

@Injectable()
export class JobUnderstandingService {
  private readonly logger = new Logger(JobUnderstandingService.name);

  constructor(private readonly openai: OpenAIService) {}

  /**
   * Perform deep analysis of a job posting to extract insights
   * for personalized document generation
   */
  async analyzeJobPosting(jobOffer: JobOfferInput): Promise<JobUnderstanding> {
    this.logger.log(`Analyzing job posting: ${jobOffer.title} at ${jobOffer.company}`);

    const systemPrompt = `You are an expert recruitment analyst specializing in understanding job postings deeply.
Your task is to extract comprehensive insights from job postings that will help craft highly personalized job applications.

ANALYZE CAREFULLY:

1. ROLE CONTEXT
- What is the primary category? (engineering, design, marketing, sales, finance, operations, hr, legal, executive, creative, healthcare, education, other)
- What seniority level is expected? (intern, junior, mid, senior, lead, manager, director, executive)
- What industry domain? (e.g., fintech, healthcare, e-commerce, SaaS, manufacturing)

2. COMPANY SIGNALS
- What size is this company likely? (startup, scaleup, enterprise, or unknown)
- What culture signals do you detect? (innovative, traditional, fast-paced, collaborative, results-driven, etc.)
- What values does the company emphasize?

3. REQUIREMENTS ANALYSIS
- Which skills are MUST-HAVE (explicitly required, non-negotiable)?
- Which skills are NICE-TO-HAVE (preferred, bonus)?
- What soft skills are emphasized?

4. TONE & STYLE
- What tone does the job posting use? (formal, casual, technical, creative, corporate)
- What communication style would fit best in the application? (formal, friendly, direct, consultative)

5. APPLICATION STRATEGY
- What should a candidate emphasize to stand out? (key selling points)
- What potential concerns might this employer have about candidates?
- What specific phrases, technologies, or values should be mirrored in the application?

Be specific and extract actual signals from the posting. Don't guess - only include what you can infer from the text.`;

    const userPrompt = `Analyze this job posting:

TITLE: ${jobOffer.title}
COMPANY: ${jobOffer.company}
${jobOffer.location ? `LOCATION: ${jobOffer.location}` : ''}
${jobOffer.salary ? `SALARY: ${jobOffer.salary}` : ''}
${jobOffer.contractType ? `CONTRACT: ${jobOffer.contractType}` : ''}
${jobOffer.remoteType ? `REMOTE: ${jobOffer.remoteType}` : ''}

DESCRIPTION:
${jobOffer.description}

REQUIREMENTS:
${jobOffer.requirements.map((r) => `- ${r}`).join('\n')}

Extract deep insights for crafting a highly personalized application.`;

    const understanding = await this.openai.analyzeWithSchema(
      systemPrompt,
      userPrompt,
      jobUnderstandingSchema,
      'job_understanding',
    );

    this.logger.log(
      `Job understanding complete: ${understanding.roleCategory}/${understanding.seniorityLevel} in ${understanding.industryDomain}`,
    );

    return understanding;
  }
}

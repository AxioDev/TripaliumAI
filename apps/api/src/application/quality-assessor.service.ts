import { Injectable, Logger } from '@nestjs/common';
import { OpenAIService } from '../llm/openai.service';
import { personalizationScoreSchema } from '@tripalium/shared';

// Define interfaces locally to avoid build order issues
interface PersonalizationScore {
  overallScore: number;
  dimensions: {
    companySpecificity: number;
    roleRelevance: number;
    toneAlignment: number;
    uniqueHookUsage: number;
    genericPhraseAvoidance: number;
  };
  genericPhrases: Array<{
    phrase: string;
    location: 'summary' | 'experience' | 'coverLetter';
    suggestion: string;
  }>;
  improvements: string[];
  verdict: 'excellent' | 'good' | 'acceptable' | 'needs_improvement' | 'rejected';
}

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

interface GeneratedCV {
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
  languages: Array<{ name: string; proficiency: string }>;
}

interface GeneratedCoverLetter {
  recipientName: string | null;
  recipientTitle: string | null;
  companyName: string;
  opening: string;
  body: string[];
  closing: string;
  signature: string;
}

interface JobOfferData {
  title: string;
  company: string;
  description: string;
}

@Injectable()
export class QualityAssessorService {
  private readonly logger = new Logger(QualityAssessorService.name);

  // Minimum acceptable quality score
  readonly QUALITY_THRESHOLD = 60;

  constructor(private readonly openai: OpenAIService) {}

  /**
   * Assess the personalization quality of generated documents
   */
  async assessPersonalization(
    generatedCV: GeneratedCV,
    generatedCoverLetter: GeneratedCoverLetter,
    jobOffer: JobOfferData,
    jobUnderstanding: JobUnderstanding | null,
  ): Promise<PersonalizationScore> {
    this.logger.log(`Assessing personalization quality for ${jobOffer.title} at ${jobOffer.company}`);

    const systemPrompt = `You are a strict quality assessor for job applications. Your job is to evaluate whether generated CVs and cover letters are truly personalized for a specific opportunity, or if they are generic and could apply to any similar job.

BE STRICT. Most applications should NOT score above 80. Reserve high scores for truly exceptional personalization.

SCORING CRITERIA:

1. COMPANY SPECIFICITY (0-100)
   - 90-100: Multiple specific references to company by name, industry position, recent news, products, or culture
   - 70-89: Some company-specific language beyond just the name
   - 50-69: Only mentions company name, no other specificity
   - 0-49: Could apply to any company in the industry

2. ROLE RELEVANCE (0-100)
   - 90-100: Content directly addresses specific requirements from this job posting
   - 70-89: Content broadly relevant to this type of role
   - 50-69: Generic content that fits many roles
   - 0-49: Irrelevant or misaligned content

3. TONE ALIGNMENT (0-100)
   - 90-100: Perfectly matches the posting's communication style
   - 70-89: Generally appropriate tone
   - 50-69: Neutral tone that doesn't stand out
   - 0-49: Mismatched tone (e.g., casual for formal role)

4. UNIQUE HOOK USAGE (0-100)
   - 90-100: Mirrors specific phrases, technologies, or values from the posting
   - 70-89: References some specific requirements
   - 50-69: Generic skill listing
   - 0-49: No connection to posting specifics

5. GENERIC PHRASE AVOIDANCE (0-100)
   - 90-100: No clichés, all content feels fresh and specific
   - 70-89: Minimal generic phrases
   - 50-69: Some clichés present
   - 0-49: Heavy use of generic phrases

GENERIC PHRASES TO FLAG (these are BAD):
- "I am writing to apply for..."
- "I believe I would be a great fit..."
- "I am excited about this opportunity..."
- "Proven track record..."
- "Results-driven professional..."
- "Team player with excellent communication skills..."
- "Passionate about..."
- "I am confident that..."
- "Seasoned professional..."
- "Dynamic individual..."

VERDICT THRESHOLDS:
- excellent (90+): Clearly written for this specific opportunity, exceptional personalization
- good (75-89): Mostly specific, minor generic elements
- acceptable (60-74): Adequate personalization, room for improvement
- needs_improvement (40-59): Too generic, significant rewrite needed
- rejected (<40): Could apply to any company, unacceptable`;

    const userPrompt = `Evaluate the personalization quality of these generated documents:

TARGET JOB:
- Company: ${jobOffer.company}
- Title: ${jobOffer.title}
- Description excerpt: ${jobOffer.description.slice(0, 1000)}

${jobUnderstanding ? `JOB UNDERSTANDING:
- Role Category: ${jobUnderstanding.roleCategory}
- Industry: ${jobUnderstanding.industryDomain}
- Key Requirements: ${jobUnderstanding.mustHaveSkills.join(', ')}
- Company Values: ${jobUnderstanding.companyValues.join(', ')}
- Unique Hooks to Mirror: ${jobUnderstanding.uniqueHooks.join(', ')}
- Expected Tone: ${jobUnderstanding.postingTone}` : 'No job understanding available'}

GENERATED CV SUMMARY:
"${generatedCV.summary}"

GENERATED CV SKILLS (prioritized):
${generatedCV.skills.slice(0, 10).join(', ')}

GENERATED COVER LETTER:
Opening: "${generatedCoverLetter.opening}"
Body: ${generatedCoverLetter.body.map((p) => `"${p}"`).join('\n')}
Closing: "${generatedCoverLetter.closing}"

ASSESS STRICTLY:
1. Does the CV summary specifically mention ${jobOffer.company} or their industry context?
2. Does the cover letter opening avoid generic phrases?
3. Are the skills ordered to match this specific job's requirements?
4. Does the content mirror any unique phrases from the job posting?
5. What generic phrases appear that should be replaced?`;

    try {
      const score = await this.openai.analyzeWithSchema(
        systemPrompt,
        userPrompt,
        personalizationScoreSchema,
        'personalization_score',
        { maxTokens: 2048 },
      );

      this.logger.log(
        `Quality assessment complete: ${score.overallScore}/100 (${score.verdict})`,
      );

      return score;
    } catch (error) {
      this.logger.error(`Quality assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Return a default passing score if assessment fails
      return this.getDefaultScore();
    }
  }

  /**
   * Check if quality score meets threshold
   */
  meetsQualityThreshold(score: PersonalizationScore): boolean {
    return score.overallScore >= this.QUALITY_THRESHOLD;
  }

  /**
   * Get stricter regeneration prompts based on quality feedback
   */
  getRegenerationPrompts(score: PersonalizationScore): {
    cvPromptAdditions: string;
    coverLetterPromptAdditions: string;
  } {
    const cvAdditions: string[] = [];
    const coverLetterAdditions: string[] = [];

    // Address specific dimension issues
    if (score.dimensions.companySpecificity < 70) {
      cvAdditions.push('MUST mention the company name and industry context in the summary');
      coverLetterAdditions.push('MUST include specific references to the company beyond just their name');
    }

    if (score.dimensions.roleRelevance < 70) {
      cvAdditions.push('MUST directly address the specific requirements from this job posting');
      coverLetterAdditions.push('MUST connect experience directly to the stated job requirements');
    }

    if (score.dimensions.uniqueHookUsage < 70) {
      cvAdditions.push('MUST mirror specific technologies or skills mentioned in the job posting');
      coverLetterAdditions.push('MUST reference specific phrases or values from the job posting');
    }

    if (score.dimensions.genericPhraseAvoidance < 70) {
      const phrasesToAvoid = score.genericPhrases.map((p) => `"${p.phrase}"`).join(', ');
      cvAdditions.push(`AVOID these generic phrases: ${phrasesToAvoid}`);
      coverLetterAdditions.push(`AVOID these generic phrases: ${phrasesToAvoid}`);
    }

    // Add specific improvement suggestions
    if (score.improvements.length > 0) {
      cvAdditions.push(`IMPROVEMENTS NEEDED: ${score.improvements.join('; ')}`);
      coverLetterAdditions.push(`IMPROVEMENTS NEEDED: ${score.improvements.join('; ')}`);
    }

    return {
      cvPromptAdditions: cvAdditions.join('\n'),
      coverLetterPromptAdditions: coverLetterAdditions.join('\n'),
    };
  }

  /**
   * Default score for when assessment fails
   */
  private getDefaultScore(): PersonalizationScore {
    return {
      overallScore: 65, // Passing but not great
      dimensions: {
        companySpecificity: 65,
        roleRelevance: 65,
        toneAlignment: 65,
        uniqueHookUsage: 65,
        genericPhraseAvoidance: 65,
      },
      genericPhrases: [],
      improvements: ['Quality assessment unavailable - manual review recommended'],
      verdict: 'acceptable',
    };
  }
}

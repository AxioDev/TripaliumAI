'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Briefcase,
  GraduationCap,
  Code,
  Languages,
} from 'lucide-react';

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
  languages: Array<{
    name: string;
    proficiency: string;
  }>;
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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Present';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function CVPreview({ data }: { data: GeneratedCV }) {
  return (
    <div className="space-y-6 p-6 bg-white rounded-lg border max-w-3xl">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold">
          {data.personalInfo.firstName} {data.personalInfo.lastName}
        </h1>
        <div className="flex flex-wrap justify-center gap-4 mt-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Mail className="h-3 w-3" />
            {data.personalInfo.email}
          </span>
          {data.personalInfo.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {data.personalInfo.phone}
            </span>
          )}
          {data.personalInfo.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {data.personalInfo.location}
            </span>
          )}
          {data.personalInfo.linkedIn && (
            <span className="flex items-center gap-1">
              <Linkedin className="h-3 w-3" />
              {data.personalInfo.linkedIn}
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      {data.summary && (
        <>
          <Separator />
          <div>
            <h2 className="text-lg font-semibold mb-2">Professional Summary</h2>
            <p className="text-sm text-muted-foreground">{data.summary}</p>
          </div>
        </>
      )}

      {/* Work Experience */}
      {data.workExperience.length > 0 && (
        <>
          <Separator />
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
              <Briefcase className="h-4 w-4" />
              Work Experience
            </h2>
            <div className="space-y-4">
              {data.workExperience.map((exp, i) => (
                <div key={i}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{exp.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {exp.company}
                        {exp.location && ` - ${exp.location}`}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(exp.startDate)} - {formatDate(exp.endDate)}
                    </span>
                  </div>
                  {exp.highlights.length > 0 && (
                    <ul className="list-disc list-inside mt-2 text-sm text-muted-foreground space-y-1">
                      {exp.highlights.map((highlight, j) => (
                        <li key={j}>{highlight}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Education */}
      {data.education.length > 0 && (
        <>
          <Separator />
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
              <GraduationCap className="h-4 w-4" />
              Education
            </h2>
            <div className="space-y-3">
              {data.education.map((edu, i) => (
                <div key={i} className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{edu.degree}</h3>
                    <p className="text-sm text-muted-foreground">
                      {edu.institution}
                      {edu.field && ` - ${edu.field}`}
                    </p>
                  </div>
                  {edu.endDate && (
                    <span className="text-xs text-muted-foreground">
                      {formatDate(edu.endDate)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Skills */}
      {data.skills.length > 0 && (
        <>
          <Separator />
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold mb-3">
              <Code className="h-4 w-4" />
              Skills
            </h2>
            <div className="flex flex-wrap gap-2">
              {data.skills.map((skill, i) => (
                <Badge key={i} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Languages */}
      {data.languages.length > 0 && (
        <>
          <Separator />
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold mb-3">
              <Languages className="h-4 w-4" />
              Languages
            </h2>
            <div className="flex flex-wrap gap-4">
              {data.languages.map((lang, i) => (
                <span key={i} className="text-sm">
                  <span className="font-medium">{lang.name}</span>
                  <span className="text-muted-foreground"> - {lang.proficiency}</span>
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function CoverLetterPreview({ data }: { data: GeneratedCoverLetter }) {
  return (
    <div className="space-y-6 p-6 bg-white rounded-lg border max-w-3xl">
      {/* Recipient */}
      <div>
        {data.recipientName && (
          <p>
            {data.recipientName}
            {data.recipientTitle && <span>, {data.recipientTitle}</span>}
          </p>
        )}
        <p>{data.companyName}</p>
      </div>

      {/* Greeting */}
      <p>
        Dear {data.recipientName ? data.recipientName : 'Hiring Manager'},
      </p>

      {/* Opening */}
      <p className="text-sm leading-relaxed">{data.opening}</p>

      {/* Body */}
      {data.body.map((paragraph, i) => (
        <p key={i} className="text-sm leading-relaxed">
          {paragraph}
        </p>
      ))}

      {/* Closing */}
      <p className="text-sm leading-relaxed">{data.closing}</p>

      {/* Signature */}
      <div className="pt-4">
        <p>Sincerely,</p>
        <p className="font-medium mt-2">{data.signature}</p>
      </div>
    </div>
  );
}

export function DocumentPreview({
  type,
  content,
}: {
  type: 'CV' | 'COVER_LETTER';
  content: unknown;
}) {
  if (type === 'CV') {
    return <CVPreview data={content as GeneratedCV} />;
  }
  return <CoverLetterPreview data={content as GeneratedCoverLetter} />;
}

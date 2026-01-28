/**
 * CV Template Configuration
 * Defines available templates and their characteristics
 */

export const CV_TEMPLATES = {
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'Clean, corporate design for traditional industries',
    suitableFor: ['finance', 'legal', 'enterprise', 'executive', 'operations', 'hr'],
    font: 'Segoe UI',
    accentColor: '#1e40af',
    file: 'cv-professional.html',
  },
  modern: {
    id: 'modern',
    name: 'Modern',
    description: 'Contemporary design for tech and startups',
    suitableFor: ['engineering', 'startup', 'scaleup', 'other'],
    font: 'Inter',
    accentColor: '#0f766e',
    file: 'cv-modern.html',
  },
  creative: {
    id: 'creative',
    name: 'Creative',
    description: 'Bold design for creative roles',
    suitableFor: ['design', 'marketing', 'creative'],
    font: 'Poppins',
    accentColor: '#7c3aed',
    file: 'cv-creative.html',
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'ATS-friendly, content-focused design',
    suitableFor: ['all'],
    font: 'Arial',
    accentColor: '#374151',
    file: 'cv-minimal.html',
  },
} as const;

export type CVTemplateId = keyof typeof CV_TEMPLATES;

export const COVER_LETTER_TEMPLATES = {
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional business letter format',
    suitableFor: ['formal', 'corporate'],
    font: 'Georgia',
    file: 'cover-letter-classic.html',
  },
  modern: {
    id: 'modern',
    name: 'Modern',
    description: 'Contemporary layout with clean lines',
    suitableFor: ['casual', 'technical', 'creative'],
    font: 'Inter',
    file: 'cover-letter-modern.html',
  },
} as const;

export type CoverLetterTemplateId = keyof typeof COVER_LETTER_TEMPLATES;

/**
 * Get template configuration by ID
 */
export function getCVTemplateConfig(templateId: CVTemplateId) {
  return CV_TEMPLATES[templateId];
}

export function getCoverLetterTemplateConfig(templateId: CoverLetterTemplateId) {
  return COVER_LETTER_TEMPLATES[templateId];
}

/**
 * Get all available CV templates
 */
export function getAllCVTemplates() {
  return Object.values(CV_TEMPLATES);
}

/**
 * Get all available cover letter templates
 */
export function getAllCoverLetterTemplates() {
  return Object.values(COVER_LETTER_TEMPLATES);
}

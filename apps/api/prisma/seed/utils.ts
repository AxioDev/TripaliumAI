// =============================================================================
// Demo Seed Utilities
// =============================================================================

/**
 * Get a date relative to now (days ago)
 */
export function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Get a date relative to now (hours ago)
 */
export function hoursAgo(hours: number): Date {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date;
}

/**
 * Get a random date between two dates
 */
export function randomDateBetween(start: Date, end: Date): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

/**
 * Add random hours to a date (for slightly varied timestamps)
 */
export function addRandomHours(date: Date, minHours: number, maxHours: number): Date {
  const hours = minHours + Math.random() * (maxHours - minHours);
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

/**
 * Generate a deterministic ID with demo prefix
 */
export function demoId(type: string, index: number | string): string {
  return `demo_${type}_${index}`;
}

/**
 * Generate a fake file path for demo documents
 */
export function demoFilePath(type: 'cv' | 'cover_letter', company: string, userId: string): string {
  const sanitizedCompany = company.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `uploads/${userId}/generated/${type}_${sanitizedCompany}_${Date.now()}.pdf`;
}

/**
 * Generate Lorem-like placeholder text for documents
 */
export function generatePlaceholderText(sentences: number): string {
  const loremSentences = [
    'Experienced software engineer with a passion for building scalable applications.',
    'Proven track record of delivering high-quality solutions in fast-paced environments.',
    'Strong expertise in modern web technologies and cloud architecture.',
    'Excellent communication skills and ability to work in cross-functional teams.',
    'Committed to continuous learning and staying current with industry trends.',
    'Skilled in agile methodologies and test-driven development practices.',
    'Background in mentoring junior developers and leading technical initiatives.',
    'Experience with microservices architecture and distributed systems.',
  ];

  const result: string[] = [];
  for (let i = 0; i < sentences; i++) {
    result.push(loremSentences[i % loremSentences.length]);
  }
  return result.join(' ');
}

/**
 * Format salary range for display
 */
export function formatSalaryRange(min: number, max: number, currency: string = 'EUR'): string {
  const formatNumber = (n: number) => n >= 1000 ? `${n / 1000}K` : n.toString();
  return `${formatNumber(min)} - ${formatNumber(max)} ${currency}`;
}

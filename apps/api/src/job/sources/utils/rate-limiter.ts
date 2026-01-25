import { Logger } from '@nestjs/common';

interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Minimum delay between requests in milliseconds */
  minDelayMs?: number;
}

interface RequestRecord {
  timestamp: number;
  count: number;
}

/**
 * Per-source rate limiter to prevent API abuse
 */
export class RateLimiter {
  private readonly logger = new Logger(RateLimiter.name);
  private readonly requests: Map<string, RequestRecord[]> = new Map();
  private readonly config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if a request can be made for a source
   */
  canMakeRequest(sourceId: string): boolean {
    this.cleanOldRequests(sourceId);
    const records = this.requests.get(sourceId) || [];
    const totalRequests = records.reduce((sum, r) => sum + r.count, 0);
    return totalRequests < this.config.maxRequests;
  }

  /**
   * Get time until next request is allowed (in ms)
   */
  getWaitTime(sourceId: string): number {
    this.cleanOldRequests(sourceId);
    const records = this.requests.get(sourceId) || [];

    if (records.length === 0) {
      return 0;
    }

    const totalRequests = records.reduce((sum, r) => sum + r.count, 0);

    if (totalRequests < this.config.maxRequests) {
      // Check minimum delay
      if (this.config.minDelayMs) {
        const lastRequest = Math.max(...records.map((r) => r.timestamp));
        const timeSinceLastRequest = Date.now() - lastRequest;
        if (timeSinceLastRequest < this.config.minDelayMs) {
          return this.config.minDelayMs - timeSinceLastRequest;
        }
      }
      return 0;
    }

    // Find the oldest request that will expire
    const oldestTimestamp = Math.min(...records.map((r) => r.timestamp));
    return Math.max(0, oldestTimestamp + this.config.windowMs - Date.now());
  }

  /**
   * Record a request for a source
   */
  recordRequest(sourceId: string, count = 1): void {
    const now = Date.now();
    const records = this.requests.get(sourceId) || [];
    records.push({ timestamp: now, count });
    this.requests.set(sourceId, records);
  }

  /**
   * Wait until a request can be made
   */
  async waitForSlot(sourceId: string): Promise<void> {
    const waitTime = this.getWaitTime(sourceId);
    if (waitTime > 0) {
      this.logger.debug(`Rate limiting ${sourceId}: waiting ${waitTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Execute a function with rate limiting
   */
  async execute<T>(sourceId: string, fn: () => Promise<T>): Promise<T> {
    await this.waitForSlot(sourceId);
    this.recordRequest(sourceId);
    return fn();
  }

  /**
   * Clean up old request records
   */
  private cleanOldRequests(sourceId: string): void {
    const cutoff = Date.now() - this.config.windowMs;
    const records = this.requests.get(sourceId) || [];
    const filtered = records.filter((r) => r.timestamp > cutoff);
    this.requests.set(sourceId, filtered);
  }

  /**
   * Get current request count for a source
   */
  getRequestCount(sourceId: string): number {
    this.cleanOldRequests(sourceId);
    const records = this.requests.get(sourceId) || [];
    return records.reduce((sum, r) => sum + r.count, 0);
  }

  /**
   * Reset rate limit for a source
   */
  reset(sourceId: string): void {
    this.requests.delete(sourceId);
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.requests.clear();
  }
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial delay in milliseconds */
  initialDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Jitter factor (0-1) to add randomness */
  jitterFactor?: number;
}

/**
 * Execute a function with exponential backoff retry
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
  logger?: Logger,
): Promise<T> {
  let lastError: Error | null = null;
  let delay = config.initialDelayMs;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === config.maxAttempts) {
        break;
      }

      // Calculate delay with exponential backoff
      const jitter = config.jitterFactor
        ? delay * config.jitterFactor * Math.random()
        : 0;
      const actualDelay = Math.min(delay + jitter, config.maxDelayMs);

      logger?.warn(
        `Attempt ${attempt}/${config.maxAttempts} failed: ${lastError.message}. Retrying in ${Math.round(actualDelay)}ms`,
      );

      await new Promise((resolve) => setTimeout(resolve, actualDelay));
      delay *= config.backoffMultiplier;
    }
  }

  throw lastError || new Error('Max retry attempts reached');
}

/**
 * Default retry configurations for different scenarios
 */
export const RetryConfigs = {
  /** Quick retries for transient errors */
  quick: {
    maxAttempts: 3,
    initialDelayMs: 100,
    maxDelayMs: 1000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  },

  /** Standard retries for API calls */
  standard: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    jitterFactor: 0.2,
  },

  /** Aggressive retries for critical operations */
  aggressive: {
    maxAttempts: 5,
    initialDelayMs: 500,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterFactor: 0.3,
  },
} as const;

/**
 * Default rate limit configurations for job sources
 */
export const RateLimitConfigs = {
  /** RemoteOK - be respectful to their free API */
  remoteok: {
    maxRequests: 30,
    windowMs: 60000, // 30 requests per minute
    minDelayMs: 1000, // At least 1 second between requests
  },

  /** WTTJ Algolia - generous limits */
  wttj: {
    maxRequests: 100,
    windowMs: 60000, // 100 requests per minute
    minDelayMs: 100,
  },

  /** Indeed via JobSpy MCP - moderate limits to avoid scraping detection */
  indeed: {
    maxRequests: 20,
    windowMs: 60000, // 20 requests per minute
    minDelayMs: 2000, // At least 2 seconds between requests
  },

  /** Mock adapter - no limits */
  mock: {
    maxRequests: 1000,
    windowMs: 60000,
    minDelayMs: 0,
  },

  /** Default for unknown sources */
  default: {
    maxRequests: 60,
    windowMs: 60000, // 60 requests per minute
    minDelayMs: 500,
  },
} as const;

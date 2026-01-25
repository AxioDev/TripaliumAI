import { Logger } from '@nestjs/common';

/**
 * RSS feed item structure
 */
export interface RssItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  guid?: string;
  categories?: string[];
  author?: string;
  content?: string;
  [key: string]: unknown;
}

/**
 * RSS feed structure
 */
export interface RssFeed {
  title: string;
  description: string;
  link: string;
  items: RssItem[];
  lastBuildDate?: string;
}

/**
 * Simple RSS parser that doesn't require external dependencies
 * Falls back to basic XML parsing
 */
export class RssParser {
  private readonly logger = new Logger(RssParser.name);

  /**
   * Parse RSS feed from URL
   */
  async parseUrl(url: string, options?: { timeout?: number }): Promise<RssFeed> {
    const timeout = options?.timeout || 30000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TripaliumAI Job Discovery Bot/1.0 (+https://tripalium.ai)',
          Accept: 'application/rss+xml, application/xml, text/xml, */*',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xml = await response.text();
      return this.parseXml(xml);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`RSS feed timeout after ${timeout}ms: ${url}`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Parse RSS XML string
   */
  parseXml(xml: string): RssFeed {
    // Extract channel info
    const titleMatch = xml.match(/<channel>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
    const descMatch = xml.match(/<channel>[\s\S]*?<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);
    const linkMatch = xml.match(/<channel>[\s\S]*?<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/);
    const lastBuildMatch = xml.match(/<lastBuildDate>([\s\S]*?)<\/lastBuildDate>/);

    // Extract items
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
    const items: RssItem[] = [];

    for (const match of itemMatches) {
      const itemXml = match[1];
      const item = this.parseItem(itemXml);
      if (item) {
        items.push(item);
      }
    }

    return {
      title: this.cleanText(titleMatch?.[1] || ''),
      description: this.cleanText(descMatch?.[1] || ''),
      link: this.cleanText(linkMatch?.[1] || ''),
      items,
      lastBuildDate: lastBuildMatch?.[1],
    };
  }

  /**
   * Parse a single RSS item
   */
  private parseItem(itemXml: string): RssItem | null {
    const title = this.extractTag(itemXml, 'title');
    const link = this.extractTag(itemXml, 'link');

    if (!title && !link) {
      return null;
    }

    const description = this.extractTag(itemXml, 'description');
    const content = this.extractTag(itemXml, 'content:encoded') || this.extractTag(itemXml, 'content');
    const pubDate = this.extractTag(itemXml, 'pubDate');
    const guid = this.extractTag(itemXml, 'guid');
    const author = this.extractTag(itemXml, 'author') || this.extractTag(itemXml, 'dc:creator');

    // Extract categories
    const categoryMatches = itemXml.matchAll(/<category(?:[^>]*)?>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/g);
    const categories: string[] = [];
    for (const match of categoryMatches) {
      const cat = this.cleanText(match[1]);
      if (cat) {
        categories.push(cat);
      }
    }

    return {
      title: title || '',
      link: link || '',
      description,
      content,
      pubDate,
      guid,
      author,
      categories: categories.length > 0 ? categories : undefined,
    };
  }

  /**
   * Extract a tag value from XML
   */
  private extractTag(xml: string, tagName: string): string | undefined {
    // Handle namespaced tags (e.g., content:encoded)
    const escapedTag = tagName.replace(':', '\\:');
    const regex = new RegExp(
      `<${escapedTag}(?:[^>]*)?>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${escapedTag}>`,
      'i',
    );
    const match = xml.match(regex);
    if (match) {
      return this.cleanText(match[1]);
    }
    return undefined;
  }

  /**
   * Clean text content (decode entities, trim whitespace)
   */
  private cleanText(text: string): string {
    return text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .trim();
  }

  /**
   * Parse HTML and extract text content
   */
  stripHtml(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}

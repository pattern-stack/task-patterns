import { logger } from '@atoms/shared/logger';

export interface ParsedQuery {
  keywords: string[];
  filters: QueryFilters;
  operators: QueryOperator[];
  sorting?: SortCriteria;
  confidence: number; // 0-1, how well we parsed the query
}

export interface QueryFilters {
  assignee?: string[];
  team?: string[];
  status?: string[];
  priority?: string[];
  labels?: string[];
  created?: TimeFrame;
  updated?: TimeFrame;
  project?: string;
}

export interface QueryOperator {
  type: 'and' | 'or' | 'not';
  position: number;
}

export interface SortCriteria {
  field: 'created' | 'updated' | 'priority' | 'title';
  direction: 'asc' | 'desc';
}

export interface TimeFrame {
  type: 'relative' | 'absolute';
  value: string;
  startDate?: Date;
  endDate?: Date;
}

export class NaturalQueryParser {
  private static readonly PRIORITY_KEYWORDS = {
    urgent: ['urgent', 'critical', 'p0', 'p1', 'high priority', 'high-priority'],
    high: ['high', 'important', 'p2'],
    medium: ['medium', 'normal', 'p3'],
    low: ['low', 'minor', 'p4'],
  };

  private static readonly STATUS_KEYWORDS = {
    todo: ['todo', 'to-do', 'backlog', 'planned'],
    'in-progress': ['in progress', 'in-progress', 'doing', 'active', 'started'],
    'in-review': ['in review', 'in-review', 'reviewing', 'code review'],
    done: ['done', 'completed', 'finished', 'closed'],
    canceled: ['canceled', 'cancelled', 'dropped'],
  };

  private static readonly TIME_KEYWORDS = {
    today: { type: 'relative' as const, value: 'today' },
    yesterday: { type: 'relative' as const, value: 'yesterday' },
    'this-week': { type: 'relative' as const, value: 'this-week' },
    'last-week': { type: 'relative' as const, value: 'last-week' },
    'this-month': { type: 'relative' as const, value: 'this-month' },
    'last-month': { type: 'relative' as const, value: 'last-month' },
  };

  private static readonly ASSIGNEE_KEYWORDS = ['assigned to', 'assignee:', '@'];
  private static readonly ME_KEYWORDS = ['me', '@me', 'my', 'mine'];

  /**
   * Parse a natural language query into structured components
   */
  static parse(query: string): ParsedQuery {
    const lowercaseQuery = query.toLowerCase();
    const result: ParsedQuery = {
      keywords: [],
      filters: {},
      operators: [],
      confidence: 1.0,
    };

    // Extract priority
    const priority = this.extractPriority(lowercaseQuery);
    if (priority) {
      result.filters.priority = [priority];
    }

    // Extract status
    const status = this.extractStatus(lowercaseQuery);
    if (status) {
      result.filters.status = [status];
    }

    // Extract assignee
    const assignee = this.extractAssignee(query);
    if (assignee) {
      result.filters.assignee = [assignee];
    }

    // Extract time frame
    const timeFrame = this.extractTimeFrame(lowercaseQuery);
    if (timeFrame) {
      if (lowercaseQuery.includes('created') || lowercaseQuery.includes('new')) {
        result.filters.created = timeFrame;
      } else if (lowercaseQuery.includes('updated') || lowercaseQuery.includes('modified')) {
        result.filters.updated = timeFrame;
      } else {
        // Default to created
        result.filters.created = timeFrame;
      }
    }

    // Extract labels (look for #label or label:value patterns)
    const labels = this.extractLabels(query);
    if (labels.length > 0) {
      result.filters.labels = labels;
    }

    // Extract remaining keywords (words not part of filters)
    result.keywords = this.extractKeywords(query, result.filters);

    // Calculate confidence based on how much we could parse
    result.confidence = this.calculateConfidence(query, result);

    // Extract sorting if present
    const sorting = this.extractSorting(lowercaseQuery);
    if (sorting) {
      result.sorting = sorting;
    }

    logger.debug('Parsed natural language query', { query, result });
    return result;
  }

  /**
   * Extract priority from query
   */
  private static extractPriority(query: string): string | null {
    for (const [priority, keywords] of Object.entries(this.PRIORITY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (query.includes(keyword)) {
          return priority;
        }
      }
    }
    return null;
  }

  /**
   * Extract status from query
   */
  private static extractStatus(query: string): string | null {
    for (const [status, keywords] of Object.entries(this.STATUS_KEYWORDS)) {
      for (const keyword of keywords) {
        if (query.includes(keyword)) {
          return status;
        }
      }
    }
    return null;
  }

  /**
   * Extract assignee from query
   */
  private static extractAssignee(query: string): string | null {
    const lowerQuery = query.toLowerCase();

    // Check for "me" keywords
    for (const meKeyword of this.ME_KEYWORDS) {
      if (lowerQuery.includes(meKeyword)) {
        return '@me';
      }
    }

    // Check for @username pattern
    const atMatch = query.match(/@(\w+)/);
    if (atMatch) {
      return atMatch[1];
    }

    // Check for "assigned to X" pattern
    const assignedToMatch = query.match(/assigned to (\w+)/i);
    if (assignedToMatch) {
      return assignedToMatch[1];
    }

    return null;
  }

  /**
   * Extract time frame from query
   */
  private static extractTimeFrame(query: string): TimeFrame | null {
    for (const [keyword, timeFrame] of Object.entries(this.TIME_KEYWORDS)) {
      if (query.includes(keyword)) {
        return timeFrame;
      }
    }

    // Check for "X days ago" pattern
    const daysAgoMatch = query.match(/(\d+) days? ago/);
    if (daysAgoMatch) {
      return {
        type: 'relative',
        value: `${daysAgoMatch[1]}-days-ago`,
      };
    }

    return null;
  }

  /**
   * Extract labels from query
   */
  private static extractLabels(query: string): string[] {
    const labels: string[] = [];

    // Match #label pattern
    const hashtagMatches = query.match(/#(\w+)/g);
    if (hashtagMatches) {
      labels.push(...hashtagMatches.map((m) => m.substring(1)));
    }

    // Match label:value pattern
    const labelMatches = query.match(/label:(\w+)/gi);
    if (labelMatches) {
      labels.push(...labelMatches.map((m) => m.split(':')[1]));
    }

    return [...new Set(labels)]; // Remove duplicates
  }

  /**
   * Extract keywords not part of filters
   */
  static extractKeywords(query: string, filters: QueryFilters): string[] {
    let remainingQuery = query.toLowerCase();

    // Remove filter-related words
    const filterWords = [
      ...(filters.priority || []),
      ...(filters.status || []),
      ...(filters.assignee || []),
      ...(filters.labels || []),
    ];

    for (const word of filterWords) {
      remainingQuery = remainingQuery.replace(new RegExp(word, 'gi'), '');
    }

    // Remove common filter keywords
    const commonKeywords = [
      'assigned to',
      'priority',
      'status',
      'label:',
      'created',
      'updated',
      'this week',
      'last week',
      'today',
      'yesterday',
    ];

    for (const keyword of commonKeywords) {
      remainingQuery = remainingQuery.replace(new RegExp(keyword, 'gi'), '');
    }

    // Split and clean remaining words
    const words = remainingQuery
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 2 && !w.startsWith('#') && !w.startsWith('@'));

    return words;
  }

  /**
   * Extract sorting criteria from query
   */
  private static extractSorting(query: string): SortCriteria | null {
    if (query.includes('newest') || query.includes('latest')) {
      return { field: 'created', direction: 'desc' };
    }
    if (query.includes('oldest')) {
      return { field: 'created', direction: 'asc' };
    }
    if (query.includes('recently updated')) {
      return { field: 'updated', direction: 'desc' };
    }
    if (query.includes('highest priority')) {
      return { field: 'priority', direction: 'desc' };
    }
    return null;
  }

  /**
   * Calculate confidence score for the parsing
   */
  private static calculateConfidence(query: string, result: ParsedQuery): number {
    const words = query.split(/\s+/);
    const totalWords = words.length;

    // Count how many words we could categorize
    let categorizedWords = 0;
    categorizedWords += result.keywords.length;
    categorizedWords += Object.keys(result.filters).length;

    if (totalWords === 0) {
      return 0;
    }

    const ratio = categorizedWords / totalWords;
    return Math.min(1, ratio * 1.2); // Slightly boost to account for multi-word matches
  }
}

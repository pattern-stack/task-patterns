import { logger } from '@atoms/shared/logger';

export interface ParsedIdentifier {
  type: 'team-number' | 'number-only' | 'uuid';
  original: string;
  teamKey?: string;
  number?: number;
  uuid?: string;
}

export class IssueIdentifierParser {
  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  private static readonly TEAM_NUMBER_REGEX = /^([A-Z]+)-(\d+)$/i;
  private static readonly NUMBER_ONLY_REGEX = /^#?(\d+)$/;

  /**
   * Parse an issue identifier into its components
   * Supports formats: ENG-123, #123, 123, UUID
   */
  static parse(identifier: string): ParsedIdentifier | null {
    if (!identifier || typeof identifier !== 'string') {
      return null;
    }

    const trimmed = identifier.trim();

    // Check for UUID format
    if (this.UUID_REGEX.test(trimmed)) {
      return {
        type: 'uuid',
        original: identifier,
        uuid: trimmed.toLowerCase(),
      };
    }

    // Check for TEAM-123 format
    const teamNumberMatch = trimmed.match(this.TEAM_NUMBER_REGEX);
    if (teamNumberMatch) {
      return {
        type: 'team-number',
        original: identifier,
        teamKey: teamNumberMatch[1].toUpperCase(),
        number: parseInt(teamNumberMatch[2], 10),
      };
    }

    // Check for #123 or 123 format
    const numberOnlyMatch = trimmed.match(this.NUMBER_ONLY_REGEX);
    if (numberOnlyMatch) {
      return {
        type: 'number-only',
        original: identifier,
        number: parseInt(numberOnlyMatch[1], 10),
      };
    }

    logger.debug(`Could not parse identifier: ${identifier}`);
    return null;
  }

  /**
   * Extract team key from an identifier like ENG-123
   */
  static extractTeamKey(identifier: string): string | null {
    const parsed = this.parse(identifier);
    return parsed?.teamKey || null;
  }

  /**
   * Check if a string is a valid UUID
   */
  static isUUID(str: string): boolean {
    return this.UUID_REGEX.test(str);
  }

  /**
   * Normalize an identifier for consistent comparison
   */
  static normalizeIdentifier(identifier: string): string {
    const parsed = this.parse(identifier);
    if (!parsed) {
      return identifier;
    }

    switch (parsed.type) {
      case 'team-number':
        return `${parsed.teamKey}-${parsed.number}`;
      case 'number-only':
        return `#${parsed.number}`;
      case 'uuid':
        return parsed.uuid!;
      default:
        return identifier;
    }
  }

  /**
   * Format an identifier for display
   */
  static formatForDisplay(identifier: string): string {
    const parsed = this.parse(identifier);
    if (!parsed) {
      return identifier;
    }

    switch (parsed.type) {
      case 'team-number':
        return `${parsed.teamKey}-${parsed.number}`;
      case 'number-only':
        return `#${parsed.number}`;
      case 'uuid':
        return parsed.uuid!.substring(0, 8) + '...';
      default:
        return identifier;
    }
  }
}

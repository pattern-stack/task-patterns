/**
 * Common validation functions
 * Pure functions for validating common data types
 */

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Email regex pattern - more strict validation
const EMAIL_REGEX = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// URL regex pattern - handle localhost and more cases
const URL_REGEX = /^https?:\/\/(localhost(:\d+)?|(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6})\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

// Linear identifier pattern (e.g., ENG-123) - must be 2-5 uppercase letters followed by dash and numbers
const LINEAR_IDENTIFIER_REGEX = /^[A-Z]{2,5}-\d+$/;

export const CommonValidators = {
  /**
   * Validate UUID format
   */
  isValidUUID: (id: string): boolean => {
    return UUID_REGEX.test(id);
  },

  /**
   * Validate email format
   */
  isValidEmail: (email: string): boolean => {
    return EMAIL_REGEX.test(email);
  },

  /**
   * Validate URL format
   */
  isValidUrl: (url: string): boolean => {
    return URL_REGEX.test(url);
  },

  /**
   * Check if string is non-empty
   */
  isNonEmptyString: (value: string): boolean => {
    return typeof value === 'string' && value.trim().length > 0;
  },

  /**
   * Validate Linear identifier format (e.g., ENG-123)
   */
  isValidLinearIdentifier: (identifier: string): boolean => {
    return LINEAR_IDENTIFIER_REGEX.test(identifier);
  },

  /**
   * Check if value is within range
   */
  isInRange: (value: number, min: number, max: number): boolean => {
    return Number.isFinite(value) && value >= min && value <= max;
  },

  /**
   * Validate array is non-empty
   */
  isNonEmptyArray: <T>(array: T[]): boolean => {
    return Array.isArray(array) && array.length > 0;
  },

  /**
   * Check if date is valid
   */
  isValidDate: (date: string | Date): boolean => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d instanceof Date && !isNaN(d.getTime());
  },

  /**
   * Check if date is in future
   */
  isFutureDate: (date: string | Date): boolean => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return CommonValidators.isValidDate(d) && d > new Date();
  },

  /**
   * Check if date is in past
   */
  isPastDate: (date: string | Date): boolean => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return CommonValidators.isValidDate(d) && d < new Date();
  },

  /**
   * Validate hex color code
   */
  isValidHexColor: (color: string): boolean => {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  },

  /**
   * Validate slug format (lowercase, hyphenated)
   */
  isValidSlug: (slug: string): boolean => {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  },

  /**
   * Check if string length is within bounds
   */
  isValidLength: (value: string, min: number, max: number): boolean => {
    return value.length >= min && value.length <= max;
  },

  /**
   * Validate team key format (uppercase letters)
   */
  isValidTeamKey: (key: string): boolean => {
    return /^[A-Z]{2,5}$/.test(key);
  },
} as const;
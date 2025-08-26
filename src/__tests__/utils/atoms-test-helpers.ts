/**
 * Test utilities specifically for testing the atoms layer
 * Includes helpers for discriminated unions, validators, and calculations
 */

import type { 
  OperationResult, 
  ValidationResult,
  BulkResult 
} from '@atoms/types/results';

/**
 * Type guard testing utilities for discriminated unions
 */
export class ResultTestUtils {
  /**
   * Assert that a result is successful and extract the data
   */
  static assertSuccess<T>(result: OperationResult<T>): T {
    if (!result.success) {
      throw new Error(`Expected success but got error: ${result.error}`);
    }
    return result.data;
  }

  /**
   * Assert that a result is an error and extract the error code
   */
  static assertError<T>(result: OperationResult<T>): string {
    if (result.success) {
      throw new Error(`Expected error but got success with data: ${JSON.stringify(result.data)}`);
    }
    return result.code;
  }

  /**
   * Assert that a validation result is valid
   */
  static assertValid(result: ValidationResult): void {
    if (!result.valid) {
      throw new Error(`Expected valid but got errors: ${'errors' in result ? result.errors.join(', ') : 'unknown'}`);
    }
  }

  /**
   * Assert that a validation result is invalid and has specific errors
   */
  static assertInvalid(result: ValidationResult, expectedErrors?: string[]): void {
    if (result.valid) {
      throw new Error('Expected invalid but got valid result');
    }
    
    if (expectedErrors && 'errors' in result) {
      const errors = result.errors || [];
      expectedErrors.forEach(expectedError => {
        const hasError = errors.some(error => error.includes(expectedError));
        if (!hasError) {
          throw new Error(`Expected error containing "${expectedError}" but got: ${errors.join(', ')}`);
        }
      });
    }
  }

  /**
   * Assert bulk result statistics
   */
  static assertBulkResult<T>(
    result: BulkResult<T>,
    expected: {
      totalCount?: number;
      successCount?: number;
      failureCount?: number;
    }
  ): void {
    if (expected.totalCount !== undefined) {
      expect(result.totalCount).toBe(expected.totalCount);
    }
    
    if (expected.successCount !== undefined) {
      expect(result.successCount).toBe(expected.successCount);
    }
    
    if (expected.failureCount !== undefined) {
      expect(result.failureCount).toBe(expected.failureCount);
    }
  }
}

/**
 * Validator testing utilities
 */
export class ValidatorTestUtils {
  /**
   * Test that a validator accepts valid inputs
   */
  static testValidInputs<T>(
    validator: (input: T) => boolean | ValidationResult,
    validInputs: T[],
    description?: string
  ): void {
    validInputs.forEach(input => {
      const result = validator(input);
      const isValid = typeof result === 'boolean' ? result : result.valid;
      
      if (!isValid) {
        const errorMsg = typeof result === 'boolean' 
          ? 'Validation failed'
          : ('errors' in result ? result.errors.join(', ') : 'Unknown error');
        throw new Error(
          `${description || 'Validator'} rejected valid input: ${JSON.stringify(input)}. Error: ${errorMsg}`
        );
      }
    });
  }

  /**
   * Test that a validator rejects invalid inputs
   */
  static testInvalidInputs<T>(
    validator: (input: T) => boolean | ValidationResult,
    invalidInputs: T[],
    description?: string
  ): void {
    invalidInputs.forEach(input => {
      const result = validator(input);
      const isValid = typeof result === 'boolean' ? result : result.valid;
      
      if (isValid) {
        throw new Error(
          `${description || 'Validator'} accepted invalid input: ${JSON.stringify(input)}`
        );
      }
    });
  }

  /**
   * Test validator with edge cases
   */
  static testEdgeCases<T>(
    validator: (input: T) => boolean | ValidationResult,
    edgeCases: { input: T; expected: boolean; description: string }[]
  ): void {
    edgeCases.forEach(({ input, expected, description }) => {
      const result = validator(input);
      const isValid = typeof result === 'boolean' ? result : result.valid;
      
      if (isValid !== expected) {
        throw new Error(
          `${description}: Expected ${expected} but got ${isValid} for input: ${JSON.stringify(input)}`
        );
      }
    });
  }

  /**
   * Create a test suite for a validator
   */
  static createValidatorTestSuite(
    validatorName: string,
    validator: (input: any) => boolean | ValidationResult,
    config: {
      valid: any[];
      invalid: any[];
      edgeCases?: { input: any; expected: boolean; description: string }[];
    }
  ): void {
    describe(validatorName, () => {
      it('should accept valid inputs', () => {
        this.testValidInputs(validator, config.valid, validatorName);
      });

      it('should reject invalid inputs', () => {
        this.testInvalidInputs(validator, config.invalid, validatorName);
      });

      if (config.edgeCases) {
        it('should handle edge cases correctly', () => {
          this.testEdgeCases(validator, config.edgeCases);
        });
      }
    });
  }
}

/**
 * Calculation testing utilities
 */
export class CalculationTestUtils {
  /**
   * Test calculation accuracy within a tolerance
   */
  static assertWithinTolerance(
    actual: number,
    expected: number,
    tolerance = 0.0001
  ): void {
    const diff = Math.abs(actual - expected);
    if (diff > tolerance) {
      throw new Error(
        `Value ${actual} is not within tolerance ${tolerance} of expected ${expected} (diff: ${diff})`
      );
    }
  }

  /**
   * Test percentage calculations
   */
  static assertPercentage(value: number, min = 0, max = 100): void {
    if (value < min || value > max) {
      throw new Error(`Percentage ${value} is not within range ${min}-${max}`);
    }
  }

  /**
   * Test date calculations
   */
  static assertDateInRange(
    date: Date,
    minDate: Date,
    maxDate: Date
  ): void {
    if (date < minDate || date > maxDate) {
      throw new Error(
        `Date ${date.toISOString()} is not within range ${minDate.toISOString()} - ${maxDate.toISOString()}`
      );
    }
  }

  /**
   * Test duration calculations
   */
  static assertDuration(
    startDate: Date,
    endDate: Date,
    expectedDays: number,
    tolerance = 1
  ): void {
    const msPerDay = 24 * 60 * 60 * 1000;
    const actualDays = (endDate.getTime() - startDate.getTime()) / msPerDay;
    const diff = Math.abs(actualDays - expectedDays);
    
    if (diff > tolerance) {
      throw new Error(
        `Duration ${actualDays} days is not within tolerance ${tolerance} of expected ${expectedDays} days`
      );
    }
  }

  /**
   * Test metric calculations with multiple assertions
   */
  static assertMetrics(
    actual: Record<string, number>,
    expected: Record<string, number>,
    tolerance = 0.0001
  ): void {
    Object.keys(expected).forEach(key => {
      if (!(key in actual)) {
        throw new Error(`Missing metric: ${key}`);
      }
      this.assertWithinTolerance(actual[key], expected[key], tolerance);
    });
  }
}

/**
 * Mock data generators for testing pure functions
 */
export class AtomTestDataGenerators {
  /**
   * Generate test cases for string validators
   */
  static generateStringTestCases(): {
    valid: string[];
    invalid: any[];
    edgeCases: string[];
  } {
    return {
      valid: [
        'normal string',
        'String with numbers 123',
        'Special chars !@#$%',
        'Unicode 你好 🎉',
      ],
      invalid: [
        null,
        undefined,
        123,
        {},
        [],
        true,
      ],
      edgeCases: [
        '',
        ' ',
        '\\n\\t',
        'a'.repeat(1000),
      ],
    };
  }

  /**
   * Generate test cases for email validators
   */
  static generateEmailTestCases(): {
    valid: string[];
    invalid: string[];
  } {
    return {
      valid: [
        'user@example.com',
        'test.user+tag@example.co.uk',
        'name@subdomain.example.org',
        '123@numbers.com',
      ],
      invalid: [
        'invalid',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
        'user@.com',
        '',
      ],
    };
  }

  /**
   * Generate test cases for UUID validators
   */
  static generateUUIDTestCases(): {
    valid: string[];
    invalid: string[];
  } {
    return {
      valid: [
        '123e4567-e89b-12d3-a456-426614174000',
        '550e8400-e29b-41d4-a716-446655440000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      ],
      invalid: [
        '123e4567-e89b-12d3-a456',
        'not-a-uuid',
        '123e4567-xxxx-12d3-a456-426614174000',
        '',
        'g47ac10b-58cc-4372-a567-0e02b2c3d479',
      ],
    };
  }

  /**
   * Generate test cases for date range validators
   */
  static generateDateRangeTestCases(): {
    valid: Array<{ start: Date; end: Date }>;
    invalid: Array<{ start: any; end: any }>;
  } {
    return {
      valid: [
        {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31'),
        },
        {
          start: new Date('2024-01-01T00:00:00Z'),
          end: new Date('2024-01-01T23:59:59Z'),
        },
      ],
      invalid: [
        {
          start: new Date('2024-12-31'),
          end: new Date('2024-01-01'),
        },
        {
          start: 'not a date',
          end: new Date('2024-01-01'),
        },
        {
          start: null,
          end: new Date('2024-01-01'),
        },
      ],
    };
  }

  /**
   * Generate sprint test data
   */
  static generateSprintData(overrides = {}) {
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    
    return {
      id: 'sprint-123',
      name: 'Sprint 1',
      startDate: twoWeeksAgo,
      endDate: twoWeeksFromNow,
      teamId: 'team-123',
      issues: [],
      velocity: 0,
      plannedPoints: 20,
      completedPoints: 0,
      ...overrides,
    };
  }

  /**
   * Generate issue metrics test data
   */
  static generateIssueMetricsData(overrides = {}) {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    
    return {
      createdAt: twoDaysAgo,
      startedAt: yesterday,
      completedAt: now,
      estimate: 5,
      priority: 2,
      blockedTime: 0,
      ...overrides,
    };
  }
}

/**
 * Time-based testing utilities
 */
export class TimeTestUtils {
  private static originalDate: typeof Date;
  private static mockNow: number;

  /**
   * Mock Date.now() to return a fixed timestamp
   */
  static mockTime(timestamp: number | Date): void {
    this.originalDate = Date;
    this.mockNow = typeof timestamp === 'number' ? timestamp : timestamp.getTime();
    
    global.Date = class extends Date {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(TimeTestUtils.mockNow);
        } else {
          // @ts-ignore - spreading args for Date constructor
          super(...args);
        }
      }
      
      static now() {
        return TimeTestUtils.mockNow;
      }
    } as any;
  }

  /**
   * Restore original Date implementation
   */
  static restoreTime(): void {
    if (this.originalDate) {
      global.Date = this.originalDate;
    }
  }

  /**
   * Run a function with mocked time
   */
  static async withMockedTime<T>(
    timestamp: number | Date,
    fn: () => T | Promise<T>
  ): Promise<T> {
    this.mockTime(timestamp);
    try {
      return await fn();
    } finally {
      this.restoreTime();
    }
  }

  /**
   * Advance mocked time by milliseconds
   */
  static advanceTime(ms: number): void {
    if (this.mockNow) {
      this.mockNow += ms;
    }
  }
}

/**
 * Contract testing utilities
 */
export class ContractTestUtils {
  /**
   * Test that a class implements an interface correctly
   */
  static testInterfaceImplementation<T>(
    implementation: T,
    requiredMethods: string[],
    requiredProperties?: string[]
  ): void {
    // Test required methods exist and are functions
    requiredMethods.forEach(method => {
      if (!(method in (implementation as any))) {
        throw new Error(`Missing required method: ${method}`);
      }
      if (typeof (implementation as any)[method] !== 'function') {
        throw new Error(`${method} is not a function`);
      }
    });

    // Test required properties exist
    if (requiredProperties) {
      requiredProperties.forEach(property => {
        if (!(property in (implementation as any))) {
          throw new Error(`Missing required property: ${property}`);
        }
      });
    }
  }

  /**
   * Test that a function signature matches expected types
   */
  static testFunctionSignature(
    fn: Function,
    expectedArity: number,
    expectedName?: string
  ): void {
    if (fn.length !== expectedArity) {
      throw new Error(`Expected ${expectedArity} parameters but got ${fn.length}`);
    }
    
    if (expectedName && fn.name !== expectedName) {
      throw new Error(`Expected function name ${expectedName} but got ${fn.name}`);
    }
  }
}
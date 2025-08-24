import { Issue, Team, Project, User } from '@linear/sdk';

/**
 * Test helper utilities for common testing scenarios
 */

export class TestHelpers {
  /**
   * Waits for all promises in the current event loop to resolve
   */
  static async flushPromises(): Promise<void> {
    return new Promise(resolve => setImmediate(resolve));
  }

  /**
   * Creates a mock async function with controlled resolution
   */
  static createAsyncMock<T>(value: T, delay = 0): jest.Mock {
    return jest.fn().mockImplementation(async () => {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      return value;
    });
  }

  /**
   * Creates a mock that fails with an error
   */
  static createFailingMock(error: Error | string): jest.Mock {
    const err = typeof error === 'string' ? new Error(error) : error;
    return jest.fn().mockRejectedValue(err);
  }

  /**
   * Asserts that a mock was called with partial object match
   */
  static expectCalledWithPartial(mock: jest.Mock, partial: any): void {
    expect(mock).toHaveBeenCalledWith(
      expect.objectContaining(partial)
    );
  }

  /**
   * Asserts that a mock was called with array containing partial matches
   */
  static expectCalledWithArrayContaining(mock: jest.Mock, items: any[]): void {
    expect(mock).toHaveBeenCalledWith(
      expect.arrayContaining(items.map(item => 
        expect.objectContaining(item)
      ))
    );
  }

  /**
   * Creates a sequence of mock return values
   */
  static createSequenceMock<T>(values: T[]): jest.Mock {
    const mock = jest.fn();
    values.forEach(value => {
      mock.mockResolvedValueOnce(value);
    });
    return mock;
  }

  /**
   * Asserts async function throws specific error
   */
  static async expectAsyncThrows(
    fn: () => Promise<any>,
    errorClass?: any,
    message?: string
  ): Promise<void> {
    let thrown = false;
    try {
      await fn();
    } catch (error: any) {
      thrown = true;
      if (errorClass) {
        expect(error).toBeInstanceOf(errorClass);
      }
      if (message) {
        expect(error.message).toContain(message);
      }
    }
    expect(thrown).toBe(true);
  }

  /**
   * Creates a mock with spy capabilities
   */
  static createSpyMock<T>(implementation?: (...args: any[]) => T): jest.Mock {
    const calls: any[][] = [];
    const mock = jest.fn((...args) => {
      calls.push(args);
      return implementation ? implementation(...args) : undefined;
    });
    (mock as any).getCalls = () => calls;
    return mock;
  }

  /**
   * Waits for condition to be true
   */
  static async waitFor(
    condition: () => boolean,
    timeout = 5000,
    interval = 100
  ): Promise<void> {
    const startTime = Date.now();
    while (!condition()) {
      if (Date.now() - startTime > timeout) {
        throw new Error('Timeout waiting for condition');
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  /**
   * Mocks console methods for a test
   */
  static mockConsole() {
    const mocks = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      info: jest.spyOn(console, 'info').mockImplementation(),
      debug: jest.spyOn(console, 'debug').mockImplementation(),
    };

    return {
      ...mocks,
      restore: () => {
        Object.values(mocks).forEach(mock => mock.mockRestore());
      },
    };
  }

  /**
   * Creates a mock timer controller
   */
  static useFakeTimers() {
    jest.useFakeTimers();
    
    return {
      advance: (ms: number) => jest.advanceTimersByTime(ms),
      runAll: () => jest.runAllTimers(),
      runPending: () => jest.runOnlyPendingTimers(),
      restore: () => jest.useRealTimers(),
    };
  }

  /**
   * Mocks environment variables
   */
  static mockEnv(overrides: Record<string, string>) {
    const original = process.env;
    
    beforeEach(() => {
      process.env = { ...original, ...overrides };
    });

    afterEach(() => {
      process.env = original;
    });

    return {
      set: (key: string, value: string) => {
        process.env[key] = value;
      },
      remove: (key: string) => {
        delete process.env[key];
      },
      restore: () => {
        process.env = original;
      },
    };
  }
}

/**
 * Custom Jest matchers
 */
export const customMatchers = {
  toBeValidDate(received: any) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid Date`
          : `expected ${received} to be a valid Date`,
    };
  },

  toBeWithinRange(received: number, min: number, max: number) {
    const pass = received >= min && received <= max;
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be within range ${min}-${max}`
          : `expected ${received} to be within range ${min}-${max}`,
    };
  },

  toContainObject(received: any[], partial: any) {
    const pass = received.some(item =>
      Object.keys(partial).every(key => item[key] === partial[key])
    );
    return {
      pass,
      message: () =>
        pass
          ? `expected array not to contain object matching ${JSON.stringify(partial)}`
          : `expected array to contain object matching ${JSON.stringify(partial)}`,
    };
  },
};

/**
 * Test data builders for complex scenarios
 */
export class TestDataBuilder {
  static createIssueHierarchy(depth = 3, breadth = 2): any[] {
    const issues: any[] = [];
    let id = 1;

    const createLevel = (parentId: string | null, currentDepth: number) => {
      if (currentDepth > depth) return;

      for (let i = 0; i < breadth; i++) {
        const issueId = `issue-${id++}`;
        const issue = {
          id: issueId,
          identifier: `ENG-${id}`,
          title: `Issue ${id}`,
          parentId,
        };
        issues.push(issue);

        createLevel(issueId, currentDepth + 1);
      }
    };

    createLevel(null, 1);
    return issues;
  }

  static createPaginatedResponse<T>(
    items: T[],
    pageSize = 10,
    currentPage = 1
  ) {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = items.slice(start, end);

    return {
      nodes: pageItems,
      pageInfo: {
        hasNextPage: end < items.length,
        hasPreviousPage: currentPage > 1,
        startCursor: `cursor-${start}`,
        endCursor: `cursor-${end - 1}`,
      },
      totalCount: items.length,
    };
  }

  static createBulkOperationScenario(
    successCount: number,
    failureCount: number
  ) {
    const operations: any[] = [];
    
    for (let i = 0; i < successCount; i++) {
      operations.push({
        id: `success-${i}`,
        shouldSucceed: true,
      });
    }

    for (let i = 0; i < failureCount; i++) {
      operations.push({
        id: `failure-${i}`,
        shouldSucceed: false,
        error: `Operation failed for item ${i}`,
      });
    }

    return operations;
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceTestUtils {
  static async measureExecutionTime(fn: () => Promise<any>): Promise<number> {
    const start = performance.now();
    await fn();
    return performance.now() - start;
  }

  static async assertPerformance(
    fn: () => Promise<any>,
    maxMs: number
  ): Promise<void> {
    const time = await this.measureExecutionTime(fn);
    expect(time).toBeLessThan(maxMs);
  }

  static createLoadTest(
    fn: () => Promise<any>,
    concurrency: number,
    iterations: number
  ) {
    return async () => {
      const results = [];
      for (let i = 0; i < iterations; i++) {
        const batch = [];
        for (let j = 0; j < concurrency; j++) {
          batch.push(fn());
        }
        results.push(...(await Promise.all(batch)));
      }
      return results;
    };
  }
}
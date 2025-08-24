# LIN-015: Add Comprehensive Error Handling

**Status**: `todo`  
**Priority**: `high`  
**Estimate**: S (2 points)  
**Labels**: `technical-debt`, `reliability`, `error-handling`  
**Team**: Engineering  

## Description

Implement comprehensive error handling across the codebase including LinearError parsing, retry logic for rate limits, and error recovery strategies.

## Implementation Details

### File: `src/atoms/errors/linear-error.handler.ts`

```typescript
import { LinearError, LinearErrorType } from '@linear/sdk';

export class LinearErrorHandler {
  static handle(error: unknown): never {
    if (error instanceof LinearError) {
      throw this.parseLinearError(error);
    }
    
    if (this.isRateLimitError(error)) {
      throw new RateLimitError(this.extractRetryAfter(error));
    }
    
    if (this.isNetworkError(error)) {
      throw new NetworkError('Network request failed', error);
    }
    
    throw new UnknownError('An unexpected error occurred', error);
  }
  
  private static parseLinearError(error: LinearError): ApplicationError {
    const firstError = error.errors?.[0];
    
    switch (firstError?.type) {
      case LinearErrorType.AuthenticationError:
        return new AuthenticationError(firstError.message);
      case LinearErrorType.InvalidInput:
        return new ValidationError(firstError.message, firstError.path);
      case LinearErrorType.RateLimited:
        return new RateLimitError(this.extractRetryAfter(error));
      case LinearErrorType.NetworkError:
        return new NetworkError(firstError.message);
      default:
        return new ApplicationError(error.message, error);
    }
  }
}
```

### File: `src/atoms/errors/retry-strategy.ts`

```typescript
export class RetryStrategy {
  constructor(
    private maxAttempts: number = 3,
    private backoffMultiplier: number = 2,
    private initialDelay: number = 1000
  ) {}
  
  async execute<T>(
    fn: () => Promise<T>,
    options?: RetryOptions
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (!this.shouldRetry(error, attempt)) {
          throw error;
        }
        
        const delay = this.calculateDelay(attempt, error);
        await this.delay(delay);
        
        if (options?.onRetry) {
          options.onRetry(attempt, delay, error);
        }
      }
    }
    
    throw new MaxRetriesExceededError(lastError!, this.maxAttempts);
  }
  
  private shouldRetry(error: unknown, attempt: number): boolean {
    if (attempt >= this.maxAttempts) return false;
    
    if (error instanceof RateLimitError) return true;
    if (error instanceof NetworkError) return true;
    if (error instanceof TimeoutError) return true;
    
    return false;
  }
  
  private calculateDelay(attempt: number, error: unknown): number {
    if (error instanceof RateLimitError && error.retryAfter) {
      return error.retryAfter * 1000;
    }
    
    return this.initialDelay * Math.pow(this.backoffMultiplier, attempt - 1);
  }
}
```

### File: `src/atoms/errors/error-recovery.ts`

```typescript
export class ErrorRecovery {
  private recoveryStrategies = new Map<string, RecoveryStrategy>();
  
  register(errorType: string, strategy: RecoveryStrategy): void {
    this.recoveryStrategies.set(errorType, strategy);
  }
  
  async recover<T>(error: Error, context: RecoveryContext): Promise<T | null> {
    const strategy = this.recoveryStrategies.get(error.constructor.name);
    
    if (!strategy) {
      return null;
    }
    
    return await strategy.recover(error, context);
  }
}

// Example recovery strategies
export const commonRecoveryStrategies = {
  RateLimitError: {
    async recover(error: RateLimitError, context: RecoveryContext) {
      // Queue the request for later
      await context.queue.add({
        fn: context.originalFunction,
        args: context.originalArgs,
        executeAt: Date.now() + error.retryAfter * 1000,
      });
      
      return { queued: true, executeAt: error.retryAfter };
    }
  },
  
  ValidationError: {
    async recover(error: ValidationError, context: RecoveryContext) {
      // Attempt to fix common validation issues
      if (error.field === 'title' && error.message.includes('too long')) {
        const fixedArgs = { ...context.originalArgs };
        fixedArgs.title = fixedArgs.title.substring(0, 255);
        return await context.retry(fixedArgs);
      }
      
      return null;
    }
  },
};
```

### Enhanced Service Error Handling

```typescript
// Example: Enhanced IssueService with error handling
export class IssueService {
  private retryStrategy = new RetryStrategy();
  private errorRecovery = new ErrorRecovery();
  
  async create(data: IssueCreate): Promise<Issue> {
    try {
      return await this.retryStrategy.execute(
        () => this.createInternal(data),
        {
          onRetry: (attempt, delay) => {
            logger.warn(`Retrying issue creation, attempt ${attempt} after ${delay}ms`);
          }
        }
      );
    } catch (error) {
      // Attempt recovery
      const recovered = await this.errorRecovery.recover(error, {
        originalFunction: this.create.bind(this),
        originalArgs: data,
        queue: this.requestQueue,
      });
      
      if (recovered) {
        return recovered;
      }
      
      // Log and re-throw with context
      logger.error('Failed to create issue', {
        error,
        data,
        attemptedRecovery: true,
      });
      
      throw LinearErrorHandler.handle(error);
    }
  }
}
```

## Acceptance Criteria

- [ ] LinearError parsing with type detection
- [ ] Retry strategy with exponential backoff
- [ ] Rate limit handling with retry-after
- [ ] Network error detection and handling
- [ ] Error recovery strategies
- [ ] Request queuing for rate limits
- [ ] Comprehensive error logging
- [ ] Custom error classes with context
- [ ] Unit tests for error scenarios
- [ ] Integration tests with error injection

## Dependencies

- Linear SDK error types
- Logging infrastructure
- Queue system for delayed retries

## Notes

- Rate limits: 250k complexity/hour for API keys
- Global request limits: 1500/hour authenticated
- Some endpoints have specific limits
- Always respect retry-after headers
- Log errors with full context for debugging
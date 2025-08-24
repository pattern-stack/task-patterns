# Test-Driven Development (TDD) Guidelines

## Core Principle: Red-Green-Refactor

**ALL new features must follow TDD. Write tests FIRST, then code.**

## TDD Workflow

### 1. RED Phase - Write Failing Tests
- Create test file before implementation file
- Write comprehensive test cases covering:
  - Happy path scenarios
  - Edge cases
  - Error conditions
  - Boundary values
- Run tests to ensure they FAIL (no implementation yet)

### 2. GREEN Phase - Make Tests Pass
- Write MINIMUM code necessary to pass tests
- Don't optimize or beautify yet
- Focus only on making tests green
- No extra features beyond what tests require

### 3. REFACTOR Phase - Improve Code Quality
- Clean up code while keeping tests green
- Extract common patterns
- Improve naming and structure
- Add comments where necessary
- Optimize performance if needed

## Test Structure Template

```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let mockClient: any;
  
  beforeEach(() => {
    // Setup fresh instances for each test
    mockClient = createMockLinearClient();
    service = new ServiceName();
  });
  
  afterEach(() => {
    // Cleanup
    jest.clearAllMocks();
  });
  
  describe('methodName', () => {
    it('should handle successful case', async () => {
      // Arrange
      const input = { /* test data */ };
      const expected = { /* expected result */ };
      mockClient.method.mockResolvedValue(expected);
      
      // Act
      const result = await service.methodName(input);
      
      // Assert
      expect(result).toEqual(expected);
      expect(mockClient.method).toHaveBeenCalledWith(input);
    });
    
    it('should handle error case', async () => {
      // Arrange
      mockClient.method.mockRejectedValue(new Error('API Error'));
      
      // Act & Assert
      await expect(service.methodName({}))
        .rejects.toThrow('API Error');
    });
    
    it('should validate input', async () => {
      // Test validation logic
    });
    
    it('should handle edge cases', async () => {
      // Test boundaries, nulls, empty arrays, etc.
    });
  });
});
```

## Test Categories

### Unit Tests (Required for all services)
- Location: `src/__tests__/features/*.service.test.ts`
- Mock all external dependencies
- Test individual methods in isolation
- Use existing test utilities from `src/__tests__/utils/`

### Integration Tests (For workflows and entities)
- Location: `src/__tests__/molecules/*.test.ts`
- Test interaction between multiple services
- Mock only external APIs (Linear SDK)

### E2E Tests (For CLI commands)
- Location: `src/__tests__/organisms/*.test.ts`
- Test complete user workflows
- Mock Linear API responses

## Coverage Requirements

- **Minimum**: 80% code coverage
- **Target**: 90%+ for critical paths
- **Required**: 100% for error handling paths

## Testing Commands

```bash
# Run tests for a specific file
npm test -- src/__tests__/features/cycle.service.test.ts

# Run tests in watch mode during development
npm run test:watch

# Check coverage
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

## Mock Data and Utilities

Use existing test utilities:
- `createMockLinearClient()` - Returns mocked Linear SDK client
- `TestFactory` - Generate consistent test data
- `TestHelpers` - Common test utilities

Example:
```typescript
import { createMockLinearClient } from '@tests/utils/mocks';
import { TestFactory } from '@tests/fixtures/factories';

const mockClient = createMockLinearClient();
const testIssue = TestFactory.createIssue();
```

## Common Test Patterns

### Testing Async Operations
```typescript
it('should handle async operations', async () => {
  const promise = service.asyncMethod();
  await expect(promise).resolves.toBeDefined();
});
```

### Testing Errors
```typescript
it('should throw specific error', async () => {
  await expect(service.method(invalidData))
    .rejects.toThrow(ValidationError);
});
```

### Testing Pagination
```typescript
it('should paginate results', async () => {
  mockClient.issues.mockResolvedValue({
    nodes: [/* items */],
    pageInfo: { hasNextPage: true, endCursor: 'cursor-123' }
  });
  
  const result = await service.list({ first: 10 });
  expect(result.pageInfo.hasNextPage).toBe(true);
});
```

### Testing Filters
```typescript
it('should filter by criteria', async () => {
  const filter = { state: { type: { eq: 'started' } } };
  await service.list({ filter });
  
  expect(mockClient.issues).toHaveBeenCalledWith(
    expect.objectContaining({ filter })
  );
});
```

## Anti-Patterns to Avoid

❌ **Don't write implementation before tests**
❌ **Don't write tests after code is "done"**
❌ **Don't test implementation details**
❌ **Don't ignore failing tests**
❌ **Don't write meaningless tests just for coverage**

## Benefits of TDD

✅ **Cleaner APIs** - Tests drive better interface design
✅ **Fewer bugs** - Edge cases caught early
✅ **Easier refactoring** - Tests provide safety net
✅ **Living documentation** - Tests show how to use code
✅ **Faster debugging** - Issues caught immediately

## References

- Existing test examples: `src/__tests__/features/issue.service.test.ts`
- Mock utilities: `src/__tests__/utils/mocks.ts`
- Test factories: `src/__tests__/fixtures/factories.ts`
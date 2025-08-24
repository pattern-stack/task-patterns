# Testing Guide - Linear Agent

## Overview

This project uses a comprehensive testing suite with Jest, following the atomic architecture pattern. Tests are organized by layer and maintain the same separation of concerns as the production code.

## Test Structure

```
src/__tests__/
├── atoms/           # Unit tests for foundation layer
├── features/        # Unit tests for data services
├── molecules/       # Unit tests for domain entities & workflows
├── organisms/       # Integration tests for CLI/API
├── fixtures/        # Test data factories
└── utils/          # Test utilities and mocks
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### CI Pipeline
```bash
npm run test:ci
```

### Full Verification
```bash
npm run verify  # Runs typecheck, lint, and tests
```

## Test Categories

### 1. Atoms Layer Tests
Tests for foundation utilities:
- **Config**: Environment validation, singleton pattern
- **Logger**: Log levels, formatting
- **Linear Client**: Connection, initialization

### 2. Features Layer Tests
Tests for data services:
- **IssueService**: CRUD operations, bulk updates, label management
- **TeamService**: Team queries, member management
- **ProjectService**: Project lifecycle, milestone tracking

### 3. Molecules Layer Tests
Tests for domain entities and workflows:
- **IssueEntity**: Composite operations, validation, relationships
- **SprintPlanningWorkflow**: Multi-entity orchestration, capacity planning

### 4. Organisms Layer Tests
Integration tests for user interfaces:
- **CLI Commands**: Command parsing, output formatting
- **API Endpoints**: Request/response handling

## Test Utilities

### Mocks (`src/__tests__/utils/mocks.ts`)
Pre-configured mocks for Linear SDK types:
```typescript
const mockIssue = createMockIssue({
  identifier: 'ENG-123',
  title: 'Test Issue'
});
```

### Factories (`src/__tests__/fixtures/factories.ts`)
Test data generators:
```typescript
const issueData = TestFactory.issueCreate({
  title: 'Custom Issue',
  priority: 3
});
```

### Helpers (`src/__tests__/utils/test-helpers.ts`)
Testing utilities:
```typescript
// Flush promises
await TestHelpers.flushPromises();

// Mock console
const console = TestHelpers.mockConsole();
// ... test code
console.restore();

// Performance testing
await PerformanceTestUtils.assertPerformance(
  () => myAsyncFunction(),
  100 // max ms
);
```

## Writing Tests

### Unit Test Example
```typescript
describe('IssueService', () => {
  let service: IssueService;
  let mockClient: ReturnType<typeof createMockLinearClient>;

  beforeEach(() => {
    mockClient = createMockLinearClient();
    (linearClient.getClient as jest.Mock).mockReturnValue(mockClient);
    service = new IssueService();
  });

  it('should create an issue', async () => {
    const issueData = TestFactory.issueCreate();
    const mockIssue = createMockIssue(issueData);
    
    mockClient.createIssue.mockResolvedValue(
      createMockPayload(true, mockIssue)
    );

    const result = await service.create(issueData);
    
    expect(result).toEqual(mockIssue);
  });
});
```

### Integration Test Example
```typescript
describe('CLI Commands', () => {
  let program: Command;

  beforeEach(() => {
    program = new Command();
    program.exitOverride();
    issueCommands(program);
  });

  it('should create issue via CLI', async () => {
    await program.parseAsync([
      'node', 'test', 'issue', 'create',
      '-t', 'New Issue',
      '--team', 'team-123'
    ]);

    expect(mockIssueEntity.create).toHaveBeenCalled();
  });
});
```

## Mocking Strategy

### Service Layer
- Mock Linear SDK client methods
- Return consistent test data
- Test error scenarios

### Entity Layer
- Mock underlying services
- Test composition logic
- Validate orchestration

### CLI Layer
- Mock entities and services
- Test command parsing
- Verify output formatting

## Coverage Requirements

Current thresholds (configured in `jest.config.js`):
- Branches: 70%
- Functions: 80%
- Lines: 80%
- Statements: 80%

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Mock External Dependencies**: Never make real API calls
3. **Use Factories**: Generate test data consistently
4. **Test Edge Cases**: Include error scenarios
5. **Clear Assertions**: One logical assertion per test
6. **Descriptive Names**: Test names should explain what's being tested

## Debugging Tests

### Run Single Test File
```bash
npm test -- src/__tests__/features/issue.service.test.ts
```

### Run Tests Matching Pattern
```bash
npm test -- --testNamePattern="should create an issue"
```

### Debug in VS Code
Add breakpoint and use Jest runner extension or:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal"
}
```

## Continuous Integration

The `test:ci` script is optimized for CI environments:
- Runs in CI mode (no watch)
- Generates coverage reports
- Limits worker processes
- Fails on coverage threshold violations

## Troubleshooting

### Common Issues

1. **Mock not working**: Ensure mock is defined before importing tested module
2. **Async test timeout**: Increase timeout with `jest.setTimeout(10000)`
3. **Type errors in tests**: Check that mocks match interface signatures
4. **Flaky tests**: Look for missing `await` or race conditions

### Environment Setup

Before running tests, ensure:
1. Dependencies installed: `npm install`
2. TypeScript builds: `npm run build`
3. No type errors: `npm run typecheck`

## Adding New Tests

1. Create test file following naming convention: `*.test.ts`
2. Import necessary mocks and utilities
3. Write focused unit tests for single responsibility
4. Add integration tests for user-facing features
5. Update factories if new test data patterns needed
6. Run coverage to ensure thresholds met
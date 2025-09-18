# Test Expansion Plan for Linear MCP

## Current Coverage Status
- **Overall Coverage**: 45.61% lines
- **Tests Passing**: 292/292 ✅
- **Framework**: Jest with ts-jest
- **Coverage Goal**: 80% minimum

## Progress Update (2024-11-26)

### ✅ Completed
- Created comprehensive test utilities for atoms layer (`atoms-test-helpers.ts`)
- Implemented validator tests (common and issue validators)
- Implemented calculation tests (sprint calculations)
- Created test expansion documentation

### 🐛 Issues Found During Testing
- Email validator accepting some invalid formats
- URL validator not matching localhost URLs  
- Linear identifier validator accepting `ENG-0`
- Issue validators using wrong SDK property names (need fixes)

## Priority 1: Critical Gaps (Implement First)

### 1. Atoms Layer Tests (Partially Complete)
These are pure functions and should be easy to test with high coverage.

#### a. Validators (atoms/validators/) - **IN PROGRESS**
- [x] `issue.validators.test.ts` - Validation logic for issues (needs fixes)
- [x] `common.validators.test.ts` - Common validation utilities (needs fixes)

#### b. Calculations (atoms/calculations/) - **PARTIALLY COMPLETE**  
- [x] `sprint.calculations.test.ts` - Sprint metrics and velocity ✅
- [ ] `issue.calculations.test.ts` - Issue metrics (cycle time, lead time, SLA)

#### c. Type Guards (atoms/types/) - **HIGH PRIORITY**
- [ ] `results.test.ts` - Result type discriminated unions and helpers

### 2. Features Layer Transformers (0% coverage)
These are pure functions that transform data between layers.

- [ ] `features/issue/transformers.test.ts`
- [ ] `features/user/transformers.test.ts`
- [ ] `features/team/transformers.test.ts`
- [ ] `features/label/transformers.test.ts`
- [ ] `features/project/transformers.test.ts`
- [ ] `features/cycle/transformers.test.ts`
- [ ] `features/comment/transformers.test.ts`
- [ ] `features/workflow-state/transformers.test.ts`

### 3. Workflow Tests (0-34% coverage)
Complex business logic that needs thorough testing.

- [ ] `molecules/workflows/issue-relations.workflow.test.ts` (0%)
- [ ] `molecules/workflows/smart-search.workflow.test.ts` (0%)
- [ ] Expand `molecules/workflows/bulk-operations.workflow.test.ts`

## Priority 2: Service Layer Gaps (Medium Priority)

### Features with Low Coverage
- [ ] `features/project/service.test.ts` - Expand from 4.65%
- [ ] `features/cycle/service.test.ts` - Expand coverage
- [ ] `features/label/service.test.ts` - Add more test cases

## Priority 3: CLI Commands (Low Priority)
- [ ] `organisms/cli/commands/cycle.commands.test.ts` (0%)
- [ ] `organisms/cli/commands/label.commands.test.ts` (0%)
- [ ] `organisms/cli/commands/user.commands.test.ts` (0%)

## Test Utilities Created ✅

### 1. Enhanced Mock Factories
```typescript
// src/__tests__/utils/mocks.ts
- createMockLinearClient() ✅ (exists)
- createMockIssue() ✅
- createMockTeam() ✅
- createMockUser() ✅
- createMockConnection() ✅

// src/__tests__/utils/atoms-test-helpers.ts (NEW)
- ResultTestUtils ✅ (for discriminated unions)
- ValidatorTestUtils ✅ (for validator testing)
- CalculationTestUtils ✅ (for numerical assertions)
- AtomTestDataGenerators ✅ (test data generation)
- TimeTestUtils ✅ (time mocking)
- ContractTestUtils ✅ (interface testing)
```

### 2. Test Helpers
```typescript
// src/__tests__/utils/test-helpers.ts
- assertSuccess(result) - For discriminated union testing
- assertError(result) - For discriminated union testing
- expectValidationError(fn) - For validator testing
- withMockedTime(fn) - For time-based calculations
```

### 3. Test Data Builders
```typescript
// src/__tests__/utils/builders.ts
- IssueBuilder - Fluent API for creating test issues
- TeamBuilder - Fluent API for creating test teams
- CycleBuilder - Fluent API for creating test cycles
```

## Testing Strategy by Layer

### Atoms Layer (Pure Functions)
- Test all input/output combinations
- Test edge cases and boundary conditions
- Test error conditions
- No mocking needed (pure functions)

### Features Layer (Services & Transformers)
- Mock LinearClient for services
- Test CRUD operations
- Test error handling
- Test transformers with various data shapes

### Molecules Layer (Entities & Workflows)
- Mock all dependencies
- Test orchestration logic
- Test validation flows
- Test error propagation

### Organisms Layer (CLI)
- Integration tests
- Mock console output
- Test command parsing
- Test error display

## Implementation Order

### Week 1: Foundation
1. Create test utilities and helpers
2. Write atoms/validators tests
3. Write atoms/calculations tests
4. Write atoms/types tests

### Week 2: Transformers & Services
1. Write all transformer tests
2. Expand service tests to 80% coverage
3. Update mock utilities as needed

### Week 3: Workflows & Integration
1. Write workflow tests
2. Write entity tests
3. Create integration test suite

### Week 4: CLI & Polish
1. Write CLI command tests
2. Refactor and optimize tests
3. Documentation and examples

## Test Quality Checklist

For each test file:
- [ ] Tests are isolated (no side effects)
- [ ] Tests are deterministic (no flaky tests)
- [ ] Tests cover happy path
- [ ] Tests cover error cases
- [ ] Tests cover edge cases
- [ ] Tests have clear descriptions
- [ ] Tests follow AAA pattern (Arrange, Act, Assert)
- [ ] Mocks are properly typed
- [ ] Coverage is > 80%

## Success Metrics

1. **Coverage Goals**
   - Overall: > 80%
   - Atoms: > 95% (pure functions)
   - Features: > 85%
   - Molecules: > 80%
   - Organisms: > 70%

2. **Test Quality**
   - Zero flaky tests
   - Test execution < 30 seconds
   - Clear test names and descriptions
   - Maintainable test code

## Notes

- Focus on testing behavior, not implementation
- Use test doubles sparingly (prefer real objects when possible)
- Keep tests simple and readable
- One assertion per test when possible
- Use descriptive test names that explain the scenario
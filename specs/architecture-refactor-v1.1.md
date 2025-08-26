# Architecture Refactor v1.1 - Implementation Specification

## Overview

This document tracks the refactoring of the Linear MCP codebase to align with Atomic Architecture v1.1, introducing TypeScript best practices, functional programming patterns, and clear separation of concerns.

## Refactor Goals

1. **Clear Service Ownership**: Each service belongs to exactly ONE entity
2. **Cross-Entity Operations via Workflows**: ALL relationships handled by workflows
3. **API Facades for UX**: Permission layer with convenient methods
4. **Functional Utilities**: Pure functions for validators, transformers, calculations
5. **Type Safety**: Interfaces, generics, discriminated unions

## Implementation Status

### Phase 1: Atoms Layer Foundation ✅ COMPLETE

#### 1.1 Contract Interfaces ✅
- [x] `atoms/contracts/entity.contracts.ts` - Entity base interfaces
- [x] `atoms/contracts/service.contracts.ts` - Service base interfaces  
- [x] `atoms/contracts/workflow.contracts.ts` - Workflow base interfaces
- [x] `atoms/contracts/index.ts` - Central exports

#### 1.2 Validators (Functional) ✅
- [x] `atoms/validators/issue.validators.ts` - Issue validation functions
- [x] `atoms/validators/common.validators.ts` - Common validation utilities
- [x] `atoms/validators/index.ts` - Central exports

#### 1.3 Calculations (Functional) ✅
- [x] `atoms/calculations/sprint.calculations.ts` - Sprint metrics
- [x] `atoms/calculations/issue.calculations.ts` - Issue metrics
- [x] `atoms/calculations/index.ts` - Central exports

#### 1.4 Type Improvements ✅
- [x] `atoms/types/results.ts` - Discriminated unions & result types

### Phase 2: Features Layer Updates ✅ COMPLETE

#### 2.1 Add Transformers to Each Feature ✅
- [x] `features/issue/transformers.ts`
- [x] `features/user/transformers.ts`
- [x] `features/team/transformers.ts`
- [x] `features/label/transformers.ts`
- [x] `features/project/transformers.ts`
- [x] `features/cycle/transformers.ts`
- [x] `features/comment/transformers.ts`
- [x] `features/workflow-state/transformers.ts`

#### 2.2 Update Services to Accept LinearClient ✅
- [x] `features/issue/service.ts` - Implement DataService interface
- [x] `features/team/service.ts` - Implement DataService interface
- [x] `features/user/service.ts` - Implement DataService interface
- [x] `features/label/service.ts` - Implement DataService interface
- [x] `features/project/service.ts` - Implement DataService interface
- [x] `features/cycle/service.ts` - Implement DataService interface
- [x] `features/comment/service.ts` - Implement DataService interface
- [x] `features/workflow-state/service.ts` - Implement DataService interface

### Phase 3: Molecules/Entities Updates ⏳ PENDING

#### 3.1 Refactor Existing Entities
- [ ] `molecules/entities/issue.entity.ts` - Remove cross-entity operations
  - Remove: assignToUser, addLabel, removeLabel, moveToProject
  - Keep: comments namespace, pure issue operations
  - Update: Accept LinearClient in constructor

#### 3.2 Create New Domain Entities
- [ ] `molecules/entities/team.entity.ts`
- [ ] `molecules/entities/user.entity.ts`
- [ ] `molecules/entities/label.entity.ts`
- [ ] `molecules/entities/project.entity.ts`
- [ ] `molecules/entities/cycle.entity.ts`

### Phase 4: Molecules/Workflows Updates ⏳ PENDING

#### 4.1 Create Issue Relations Workflow
- [ ] `molecules/workflows/issue-relations.workflow.ts`
  - Move all cross-entity operations from IssueEntity

#### 4.2 Update Existing Workflows
- [ ] `molecules/workflows/bulk-operations.workflow.ts` - Accept LinearClient
- [ ] `molecules/workflows/smart-search.workflow.ts` - Accept LinearClient
- [ ] `molecules/workflows/sprint-planning.workflow.ts` - Accept LinearClient

### Phase 5: API Facades Layer ⏳ PENDING

#### 5.1 Create API Facades
- [ ] `molecules/apis/issue.api.ts`
- [ ] `molecules/apis/team.api.ts`
- [ ] `molecules/apis/user.api.ts`
- [ ] `molecules/apis/label.api.ts`
- [ ] `molecules/apis/project.api.ts`

### Phase 6: Update Organisms ⏳ PENDING

#### 6.1 Update CLI Commands
- [ ] Update all CLI commands to use API facades
- [ ] Remove direct entity instantiation
- [ ] Pass LinearClient through dependency injection

### Phase 7: Testing Updates ⏳ PENDING

#### 7.1 New Atoms Layer Tests
- [ ] `__tests__/atoms/contracts/entity.contracts.test.ts`
  - Test interface compliance with mock implementations
  - Test type inference works correctly
- [ ] `__tests__/atoms/contracts/service.contracts.test.ts`
  - Test interface compliance
  - Test batch result types
- [ ] `__tests__/atoms/contracts/workflow.contracts.test.ts`
  - Test workflow interface compliance
  - Test bulk operation interface

- [ ] `__tests__/atoms/validators/issue.validators.test.ts`
  - Test all validation functions with valid/invalid inputs
  - Test edge cases (empty strings, negative numbers, etc.)
- [ ] `__tests__/atoms/validators/common.validators.test.ts`
  - Test UUID validation
  - Test email validation
  - Test date validation
  - Test Linear identifier validation

- [ ] `__tests__/atoms/calculations/sprint.calculations.test.ts`
  - Test velocity calculations
  - Test progress calculations
  - Test burndown generation
  - Test health score calculations
- [ ] `__tests__/atoms/calculations/issue.calculations.test.ts`
  - Test cycle time calculations
  - Test lead time calculations
  - Test SLA status calculations
  - Test complexity scoring

- [ ] `__tests__/atoms/types/results.test.ts`
  - Test type guards work correctly
  - Test result helpers (success, error, map, chain)
  - Test discriminated union type narrowing

#### 7.2 Update Existing Service Tests
- [ ] `__tests__/features/issue.service.test.ts`
  - Mock LinearClient in constructor
  - Test DataService interface compliance
  - Remove singleton client tests
- [ ] `__tests__/features/team.service.test.ts`
  - Mock LinearClient in constructor
  - Test extended methods (getByKey)
- [ ] `__tests__/features/user.service.test.ts`
  - Mock LinearClient in constructor
  - Test extended methods (getByEmail)
- [ ] `__tests__/features/comment.service.test.ts`
  - Mock LinearClient in constructor
  - Test listForIssue method
- [ ] `__tests__/features/label.service.test.ts`
  - Mock LinearClient in constructor
- [ ] `__tests__/features/project.service.test.ts`
  - Mock LinearClient in constructor
- [ ] `__tests__/features/cycle.service.test.ts`
  - Mock LinearClient in constructor
- [ ] `__tests__/features/workflow-state.service.test.ts`
  - Mock LinearClient in constructor

#### 7.3 New Transformer Tests
- [ ] `__tests__/features/issue.transformers.test.ts`
  - Test toResponse transformation
  - Test fromCreateInput transformation
  - Test toReference transformation
- [ ] `__tests__/features/user.transformers.test.ts`
- [ ] `__tests__/features/team.transformers.test.ts`
- [ ] `__tests__/features/label.transformers.test.ts`

#### 7.4 Update Entity Tests
- [ ] `__tests__/molecules/issue.entity.test.ts`
  - Pass mock LinearClient to constructor
  - Remove tests for cross-entity methods (moved to workflow)
  - Test comments namespace
  - Test pure issue operations only
- [ ] `__tests__/molecules/team.entity.test.ts` (new)
- [ ] `__tests__/molecules/user.entity.test.ts` (new)
- [ ] `__tests__/molecules/label.entity.test.ts` (new)

#### 7.5 Update Workflow Tests
- [ ] `__tests__/molecules/bulk-operations.workflow.test.ts`
  - Pass mock LinearClient to constructor
  - Test uses IssueRelationsWorkflow for single operations
- [ ] `__tests__/molecules/smart-search.workflow.test.ts`
  - Pass mock LinearClient to constructor
- [ ] `__tests__/molecules/sprint-planning.workflow.test.ts`
  - Pass mock LinearClient to constructor
- [ ] `__tests__/molecules/issue-relations.workflow.test.ts` (new)
  - Test assignToUser
  - Test addLabel/removeLabel
  - Test moveToProject
  - Test moveToStatus

#### 7.6 New API Facade Tests
- [ ] `__tests__/molecules/apis/issue.api.test.ts`
  - Test permission checking (with mock permission service)
  - Test delegates to correct entity/workflow
  - Test uses transformers
  - Test convenience methods
- [ ] `__tests__/molecules/apis/team.api.test.ts`
- [ ] `__tests__/molecules/apis/user.api.test.ts`

#### 7.7 Update CLI Tests
- [ ] `__tests__/organisms/cli.test.ts`
  - Update to use API facades
  - Mock LinearClient injection
  - Test command execution with new architecture

#### 7.8 Update Test Utilities
- [ ] `__tests__/utils/mocks.ts`
  - Add `createMockLinearClient()` factory
  - Add `createMockPermissionService()` factory
  - Update existing mocks to work with new architecture
- [ ] `__tests__/utils/test-helpers.ts`
  - Add helpers for testing discriminated unions
  - Add helpers for testing transformers
  - Add helpers for testing validators

## Breaking Changes

### Constructor Signature Changes
All services, entities, and workflows now require LinearClient in constructor:

```typescript
// Before
const service = new IssueService();

// After
const service = new IssueService(linearClient);
```

### Removed Methods from IssueEntity
The following methods moved to `IssueRelationsWorkflow`:
- `assignToUser()` 
- `unassign()`
- `addLabel()`
- `removeLabel()`
- `moveToProject()`
- `moveToStatus()`
- `changePriority()`

### Import Path Changes
```typescript
// Before
import { IssueService } from '@features/issue/service';

// After
import { IssueService } from '@features/issue/service';
import { IssueTransformers } from '@features/issue/transformers';
import { IssueValidators } from '@atoms/validators';
```

## Testing Strategy

### Test Organization
```
__tests__/
├── atoms/
│   ├── contracts/      # Interface compliance tests
│   ├── validators/      # Pure function validation tests
│   ├── calculations/    # Pure function calculation tests
│   └── types/          # Type guard and helper tests
├── features/
│   ├── services/       # Service CRUD tests
│   └── transformers/   # Serialization tests
├── molecules/
│   ├── entities/       # Domain aggregate tests
│   ├── workflows/      # Cross-entity orchestration tests
│   └── apis/          # Permission and facade tests
└── organisms/
    └── cli/           # Command integration tests
```

### Test Principles
1. **Unit Tests**: Test each layer in isolation
2. **Mock Dependencies**: Use factory functions for mocks
3. **Test Contracts**: Ensure interfaces are properly implemented
4. **Test Pure Functions**: Comprehensive input/output testing
5. **Test Type Safety**: Verify discriminated unions work correctly

### Example Test Patterns

#### Testing Validators
```typescript
describe('IssueValidators', () => {
  describe('isValidTitle', () => {
    it('should return true for valid titles', () => {
      expect(IssueValidators.isValidTitle('Fix bug')).toBe(true);
    });
    
    it('should return false for empty titles', () => {
      expect(IssueValidators.isValidTitle('')).toBe(false);
    });
  });
});
```

#### Testing Services with DI
```typescript
describe('IssueService', () => {
  let service: IssueService;
  let mockClient: LinearClient;
  
  beforeEach(() => {
    mockClient = createMockLinearClient();
    service = new IssueService(mockClient);
  });
  
  it('should implement DataService interface', () => {
    expect(service.get).toBeDefined();
    expect(service.create).toBeDefined();
    expect(service.update).toBeDefined();
    expect(service.delete).toBeDefined();
  });
});
```

#### Testing Discriminated Unions
```typescript
describe('OperationResult', () => {
  it('should narrow type on success', () => {
    const result: OperationResult<string> = { success: true, data: 'test' };
    
    if (ResultGuards.isSuccess(result)) {
      // TypeScript knows result.data exists
      expect(result.data).toBe('test');
    }
  });
});
```

## Migration Guide

### For Service Usage

```typescript
// Old pattern
import { linearClient } from '@atoms/client/linear-client';

class IssueService {
  private client = linearClient.getClient();
}

// New pattern
import type { LinearClient } from '@linear/sdk';

class IssueService {
  constructor(private client: LinearClient) {}
}
```

### For Entity Usage

```typescript
// Old pattern
const issueEntity = new IssueEntity();
await issueEntity.addLabel(issueId, labelId);

// New pattern
const client = linearClient.getClient();
const workflow = new IssueRelationsWorkflow(client);
await workflow.addLabel(issueId, labelId);
```

### For CLI Commands

```typescript
// Old pattern
const issueEntity = new IssueEntity();

// New pattern
const client = linearClient.getClient();
const issueAPI = new IssueAPI(client);
```

## Validation Checklist

- [ ] All tests pass
- [ ] TypeScript compilation successful
- [ ] No lint errors
- [ ] All services implement contracts
- [ ] All entities follow ownership rules
- [ ] All cross-entity operations in workflows
- [ ] CLI commands use API facades
- [ ] Documentation updated
- [ ] Test coverage > 80%
- [ ] All breaking changes documented

## Notes

- Transformers are pure functions (functional style)
- Validators are pure functions (functional style)  
- Calculations are pure functions (functional style)
- Services/Entities/Workflows are classes (OOP style)
- API Facades intentionally break DRY for better UX
- Tests should mock at layer boundaries, not internal implementation
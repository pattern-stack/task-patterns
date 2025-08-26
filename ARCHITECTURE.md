# Atomic Architecture for TypeScript/Linear MCP
## Version 1.1 - Entity, Workflow, and API Facade Pattern with TypeScript Best Practices

### Table of Contents
1. [Core Principles](#core-principles)
2. [Architecture Overview](#architecture-overview)
3. [Layer Definitions](#layer-definitions)
4. [TypeScript Patterns](#typescript-patterns)
5. [Critical Rules](#critical-rules)
6. [Implementation Patterns](#implementation-patterns)
7. [Examples](#examples)
8. [Common Patterns & Anti-Patterns](#common-patterns--anti-patterns)

---

## Core Principles

### The Three Fundamental Rules

1. **Each Service Belongs to Exactly ONE Entity**
   - A service is imported by only one entity, never shared
   - This creates clear ownership boundaries

2. **ALL Cross-Entity Operations Are Workflows**
   - Even simple associations (issue ↔ label) go through workflows
   - Entities never directly interact with each other

3. **API Facades Provide the UX Layer**
   - They combine entities and workflows for convenience
   - Intentionally NOT DRY - optimize for developer experience
   - Add permission checks at this layer

### The Mental Model

```
Entities: "I own my data and my TRUE sub-resources"
Workflows: "I handle ANY interaction between entities"
API Facades: "I make it convenient for users, adding permissions and sugar"
```

### OOP vs Functional Approach

- **Domain Logic**: Object-Oriented (Entities, Workflows, Services)
- **Utilities**: Functional (Validators, Transformers, Calculations)
- **Rule**: If it needs state or complex orchestration → Class. If it's a pure transformation → Function.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        ORGANISMS                             │
│                    (User Interfaces)                         │
│         • CLI Commands  • HTTP APIs  • MCP Tools            │
└────────────────────────┬────────────────────────────────────┘
                         │ uses
┌────────────────────────▼────────────────────────────────────┐
│                    MOLECULES/APIS                            │
│                  (Permission + UX Layer)                     │
│         • Permission checks                                  │
│         • Convenient methods (not DRY on purpose!)          │
│         • Combines entities + workflows                      │
└────────────────────────┬────────────────────────────────────┘
                         │ uses
┌────────────────────────▼────────────────────────────────────┐
│              MOLECULES/ENTITIES & WORKFLOWS                  │
│                                                              │
│  ENTITIES                    │  WORKFLOWS                   │
│  • Domain aggregates         │  • Cross-entity operations   │
│  • Own their data            │  • ALL relationships         │
│  • Include sub-resources     │  • Complex orchestration     │
└────────────────────────┬────────────────────────────────────┘
                         │ uses
┌────────────────────────▼────────────────────────────────────┐
│                       FEATURES                               │
│                   (Data Services)                            │
│         • Services: CRUD operations                         │
│         • Schemas: Validation (Zod)                         │
│         • Transformers: Serialization                       │
└────────────────────────┬────────────────────────────────────┘
                         │ uses
┌────────────────────────▼────────────────────────────────────┐
│                        ATOMS                                 │
│                   (Foundation Layer)                         │
│         • Client  • Contracts  • Types  • Utils             │
│         • Validators  • Calculations  • Parsers             │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer Definitions

### Atoms Layer - Foundation
Pure utilities, shared types, and contracts. No business logic.

```typescript
atoms/
├── client/           # Linear SDK client management
├── contracts/        # TypeScript interfaces for consistency
│   ├── entity.contracts.ts    # Base entity interface
│   ├── service.contracts.ts   # Service patterns
│   └── workflow.contracts.ts  # Workflow patterns
├── shared/           # Config, logger, etc.
├── types/           # Shared TypeScript types
├── validators/      # Pure validation functions (functional)
│   ├── issue.validators.ts
│   └── common.validators.ts
├── calculations/    # Pure calculation functions (functional)
└── parsers/         # Utility parsers (functional)
```

**Functional Style in Atoms:**
```typescript
// atoms/validators/issue.validators.ts
export const IssueValidators = {
  isValidTitle: (title: string): boolean => title.length > 0,
  isValidPriority: (priority: number): boolean => priority >= 0 && priority <= 4,
  canEdit: (issue: Issue, user: User): boolean => 
    issue.creatorId === user.id || user.role === 'admin',
} as const;

// atoms/calculations/sprint.calculations.ts
export const SprintCalculations = {
  velocity: (issues: Issue[]): number =>
    issues.reduce((sum, i) => sum + (i.estimate || 0), 0),
  
  progress: (issues: Issue[]): number => {
    const done = issues.filter(i => i.state.type === 'completed').length;
    return issues.length ? done / issues.length : 0;
  },
} as const;
```

### Features Layer - Data Services
One service per Linear model. Pure CRUD operations. Now includes transformers for serialization.

```typescript
features/
├── issue/
│   ├── service.ts       # IssueService - CRUD operations
│   ├── schemas.ts       # Zod schemas for validation
│   └── transformers.ts  # Serialization/deserialization
├── label/
│   ├── service.ts
│   ├── schemas.ts
│   └── transformers.ts
└── user/
    ├── service.ts
    ├── schemas.ts
    └── transformers.ts
```

**Service with Interface:**
```typescript
// features/issue/service.ts
import { DataService } from '@atoms/contracts/service.contracts';

export class IssueService implements DataService<Issue, IssueCreate, IssueUpdate> {
  constructor(private client: LinearClient) {}
  
  async get(id: string): Promise<Issue | null> {
    return this.client.issue(id);
  }
  
  async create(data: IssueCreate): Promise<Issue> {
    const result = await this.client.createIssue(data);
    return result.issue;
  }
}
```

**Transformers (Functional):**
```typescript
// features/issue/transformers.ts
export const IssueTransformers = {
  // Serialize: Internal → External
  toResponse: (issue: Issue): IssueResponse => ({
    id: issue.id,
    title: issue.title,
    identifier: issue.identifier,
    status: issue.state ? {
      id: issue.state.id,
      name: issue.state.name,
    } : null,
  }),
  
  // Deserialize: External → Internal
  fromInput: (input: IssueCreateInput): IssueCreate => ({
    title: input.title,
    teamId: input.team_id,  // Transform naming conventions
    description: input.description || '',
  }),
  
  // Reference format
  toReference: (issue: Issue): IssueRef => ({
    id: issue.id,
    identifier: issue.identifier,
  }),
} as const;
```

**Critical Rule**: Each service is used by exactly ONE entity. Transformers can be used anywhere.

### Molecules Layer - Domain Logic

#### Entities - Domain Aggregates
```typescript
molecules/entities/
├── issue.entity.ts      # IssueEntity - owns IssueService + CommentService
├── label.entity.ts      # LabelEntity - owns LabelService
├── user.entity.ts       # UserEntity - owns UserService
└── team.entity.ts       # TeamEntity - owns TeamService
```

**Entity with Interface:**
```typescript
// molecules/entities/issue.entity.ts
import { EntityBase } from '@atoms/contracts/entity.contracts';

export class IssueEntity implements EntityBase<Issue, IssueCreate, IssueUpdate> {
  private issueService: IssueService;
  private commentService: CommentService; // Sub-resource
  
  constructor(private client: LinearClient) {
    this.issueService = new IssueService(client);
    this.commentService = new CommentService(client);
  }
  
  async get(id: string): Promise<Issue | null> {
    return this.issueService.get(id);
  }
  
  async create(data: IssueCreate): Promise<Issue> {
    return this.issueService.create(data);
  }
  
  async update(id: string, data: IssueUpdate): Promise<Issue> {
    const issue = await this.get(id);
    if (!issue) throw new NotFoundError();
    return this.issueService.update(id, data);
  }
  
  async delete(id: string): Promise<boolean> {
    return this.issueService.delete(id);
  }
  
  // Sub-resource namespace
  comments = {
    add: async (issueId: string, body: string) => {
      return this.commentService.create({ issueId, body });
    },
    list: async (issueId: string) => {
      return this.commentService.listForIssue(issueId);
    },
  };
  
  // NO cross-entity operations here!
}
```

#### Workflows - Cross-Entity Orchestration
```typescript
molecules/workflows/
├── issue-relations.workflow.ts    # ALL issue ↔ X relationships
├── bulk-operations.workflow.ts    # Operations on multiple entities
├── sprint-planning.workflow.ts    # Complex business processes
└── smart-search.workflow.ts       # Cross-entity search
```

**Workflow with Interface:**
```typescript
// molecules/workflows/bulk-operations.workflow.ts
import { BulkOperation, BulkResult } from '@atoms/contracts/workflow.contracts';

export class BulkAssignWorkflow implements BulkOperation<string> {
  private issueEntity: IssueEntity;
  private userEntity: UserEntity;
  
  constructor(private client: LinearClient) {
    this.issueEntity = new IssueEntity(client);
    this.userEntity = new UserEntity(client);
  }
  
  async execute(issueIds: string[], userId: string): Promise<BulkResult> {
    const user = await this.userEntity.get(userId);
    if (!user) throw new NotFoundError();
    
    const results = await Promise.allSettled(
      issueIds.map(id => this.assignOne(id, userId))
    );
    
    return this.formatResults(results);
  }
}
```

#### API Facades - Permission + UX Layer
```typescript
molecules/apis/
├── issue.api.ts     # Issue-centric interface with permissions
├── label.api.ts     # Label-centric interface with permissions
└── team.api.ts      # Team-centric interface with permissions
```

### Organisms Layer - User Interfaces
Thin wrappers that use API facades. No business logic.

```typescript
organisms/
├── cli/             # CLI commands
├── api/             # HTTP endpoints
└── mcp/             # MCP tools
```

---

## TypeScript Patterns

### 1. Interfaces for Contracts

Define interfaces in `atoms/contracts/` for consistent patterns across similar classes:

```typescript
// atoms/contracts/entity.contracts.ts
export interface EntityBase<TModel, TCreate, TUpdate> {
  get(id: string): Promise<TModel | null>;
  create(data: TCreate): Promise<TModel>;
  update(id: string, data: TUpdate): Promise<TModel>;
  delete(id: string): Promise<boolean>;
}

// atoms/contracts/workflow.contracts.ts
export interface Workflow<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
  validate?(input: TInput): Promise<boolean>;
}
```

### 2. Generics for Reusability

Use generics to avoid repetitive code:

```typescript
// Base class with generics
abstract class BaseEntity<TModel, TCreate, TUpdate> implements EntityBase<TModel, TCreate, TUpdate> {
  constructor(protected client: LinearClient) {}
  
  abstract get(id: string): Promise<TModel | null>;
  abstract create(data: TCreate): Promise<TModel>;
  abstract update(id: string, data: TUpdate): Promise<TModel>;
  abstract delete(id: string): Promise<boolean>;
}

// Specific implementations
class IssueEntity extends BaseEntity<Issue, IssueCreate, IssueUpdate> {
  // Implement abstract methods
}
```

### 3. Discriminated Unions for Results

Use discriminated unions for better error handling:

```typescript
// Type-safe result handling
type OperationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: Error; code: string };

// Usage
async function createIssue(data: IssueCreate): Promise<OperationResult<Issue>> {
  try {
    const issue = await issueEntity.create(data);
    return { success: true, data: issue };
  } catch (error) {
    return { 
      success: false, 
      error: error as Error,
      code: 'CREATION_FAILED'
    };
  }
}

// Type-safe handling
const result = await createIssue(data);
if (result.success) {
  console.log(result.data);  // TypeScript knows data exists
} else {
  console.log(result.error);  // TypeScript knows error exists
}
```

### 4. Const Assertions for Functional Utilities

Use `as const` for type-safe functional utilities:

```typescript
export const IssueConstants = {
  PRIORITIES: {
    URGENT: 1,
    HIGH: 2,
    MEDIUM: 3,
    LOW: 4,
  },
  STATES: {
    OPEN: 'open',
    IN_PROGRESS: 'in_progress',
    DONE: 'done',
  },
} as const;

// TypeScript infers exact types
type Priority = typeof IssueConstants.PRIORITIES[keyof typeof IssueConstants.PRIORITIES];
// Priority = 1 | 2 | 3 | 4
```

---

## Critical Rules

### 1. Service Ownership

```typescript
// ✅ CORRECT: Each service has one owner
IssueService → IssueEntity (exclusive)
CommentService → IssueEntity (comments are sub-resource)
LabelService → LabelEntity (exclusive)
UserService → UserEntity (exclusive)

// ❌ WRONG: Service used by multiple entities
LabelService → IssueEntity AND LabelEntity // NO!
```

### 2. Cross-Entity Operations

```typescript
// ❌ WRONG: Entity handling cross-entity operation
class IssueEntity {
  async addLabel(issueId: string, labelId: string) {
    // NO! This involves two entities
  }
}

// ✅ CORRECT: Workflow handles it
class IssueRelationsWorkflow {
  async addLabel(issueId: string, labelId: string) {
    const issue = await this.issueEntity.get(issueId);
    const label = await this.labelEntity.get(labelId);
    // Perform association
  }
}
```

### 3. Functional vs OOP

```typescript
// ✅ Domain logic = Classes
class IssueEntity {
  constructor(private client: LinearClient) {}  // Needs state
  async get(id: string) { /* complex logic */ }
}

// ✅ Utilities = Functions
export const IssueValidators = {
  isValid: (issue: Issue): boolean => { /* pure function */ }
} as const;
```

### 4. Transformer Usage

```typescript
// Transformers can be used anywhere (not exclusive like services)
// In API facade
const response = IssueTransformers.toResponse(issue);

// In CLI
const csv = IssueTransformers.toCSV(issue);

// In workflow
const ref = IssueTransformers.toReference(issue);
```

---

## Implementation Patterns

### Entity Pattern with Interface

```typescript
// molecules/entities/issue.entity.ts
export class IssueEntity implements EntityBase<Issue, IssueCreate, IssueUpdate> {
  private issueService: IssueService;
  private commentService: CommentService;
  
  constructor(private client: LinearClient) {
    this.issueService = new IssueService(client);
    this.commentService = new CommentService(client);
  }
  
  async get(id: string): Promise<Issue | null> {
    return this.issueService.get(id);
  }
  
  async create(data: IssueCreate): Promise<Issue> {
    // Validation using functional validators
    if (!IssueValidators.isValidTitle(data.title)) {
      throw new ValidationError('Invalid title');
    }
    return this.issueService.create(data);
  }
  
  async update(id: string, data: IssueUpdate): Promise<Issue> {
    const issue = await this.get(id);
    if (!issue) throw new NotFoundError();
    return this.issueService.update(id, data);
  }
  
  async delete(id: string): Promise<boolean> {
    return this.issueService.delete(id);
  }
  
  // Sub-resource namespace
  comments = {
    add: async (issueId: string, body: string) => {
      return this.commentService.create({ issueId, body });
    },
    list: async (issueId: string) => {
      return this.commentService.listForIssue(issueId);
    },
  };
}
```

### Workflow Pattern with Generics

```typescript
// molecules/workflows/issue-relations.workflow.ts
export class IssueRelationsWorkflow {
  private issueEntity: IssueEntity;
  private userEntity: UserEntity;
  private labelEntity: LabelEntity;
  
  constructor(private client: LinearClient) {
    this.issueEntity = new IssueEntity(client);
    this.userEntity = new UserEntity(client);
    this.labelEntity = new LabelEntity(client);
  }
  
  async assignToUser(issueId: string, userId: string): Promise<OperationResult<Issue>> {
    try {
      const [issue, user] = await Promise.all([
        this.issueEntity.get(issueId),
        this.userEntity.get(userId),
      ]);
      
      if (!issue || !user) {
        return { 
          success: false, 
          error: new NotFoundError(),
          code: 'ENTITY_NOT_FOUND'
        };
      }
      
      const updated = await this.issueEntity.update(issueId, { assigneeId: userId });
      return { success: true, data: updated };
    } catch (error) {
      return { 
        success: false, 
        error: error as Error,
        code: 'ASSIGNMENT_FAILED'
      };
    }
  }
}
```

### API Facade Pattern with Transformers

```typescript
// molecules/apis/issue.api.ts
export class IssueAPI {
  constructor(
    private client: LinearClient,
    private permissions: PermissionService
  ) {}
  
  async get(issueId: string, user: User): Promise<IssueResponse> {
    if (!this.permissions.canView(user, issueId)) {
      throw new ForbiddenError();
    }
    
    const entity = new IssueEntity(this.client);
    const issue = await entity.get(issueId);
    
    if (!issue) throw new NotFoundError();
    
    // Use transformer for serialization
    return IssueTransformers.toResponse(issue);
  }
  
  async create(input: IssueCreateInput, user: User): Promise<IssueResponse> {
    if (!this.permissions.canCreate(user)) {
      throw new ForbiddenError();
    }
    
    // Use transformer for deserialization
    const data = IssueTransformers.fromInput(input);
    
    // Use validator
    if (!IssueValidators.isValidPriority(data.priority || 0)) {
      throw new ValidationError('Invalid priority');
    }
    
    const entity = new IssueEntity(this.client);
    const issue = await entity.create(data);
    
    // Transform for response
    return IssueTransformers.toResponse(issue);
  }
}
```

---

## Examples

### Example 1: Complete Issue Creation Flow

```typescript
// 1. CLI receives input
const input: IssueCreateInput = {
  title: "Fix bug",
  team_id: "team-123",  // snake_case from API
  priority: "high"
};

// 2. API Facade handles request
class IssueAPI {
  async create(input: IssueCreateInput, user: User): Promise<IssueResponse> {
    // Check permissions
    if (!this.permissions.canCreate(user)) {
      throw new ForbiddenError();
    }
    
    // Transform input
    const data = IssueTransformers.fromInput(input);  // Converts to camelCase
    
    // Validate
    if (!IssueValidators.isValidTitle(data.title)) {
      throw new ValidationError();
    }
    
    // Create via entity
    const entity = new IssueEntity(this.client);
    const issue = await entity.create(data);
    
    // Transform response
    return IssueTransformers.toResponse(issue);
  }
}

// 3. Entity uses service
class IssueEntity {
  async create(data: IssueCreate): Promise<Issue> {
    return this.issueService.create(data);
  }
}

// 4. Service calls Linear API
class IssueService {
  async create(data: IssueCreate): Promise<Issue> {
    const result = await this.client.createIssue(data);
    return result.issue;
  }
}
```

### Example 2: Using Type-Safe Results

```typescript
// Define result type
type CreateResult = OperationResult<Issue>;

// In workflow
async function handleIssueCreation(data: IssueCreate): Promise<void> {
  const result: CreateResult = await createIssue(data);
  
  // TypeScript enforces exhaustive handling
  if (result.success) {
    console.log(`Created: ${result.data.identifier}`);
    await notifyTeam(result.data);
  } else {
    console.error(`Failed: ${result.error.message}`);
    await logError(result.code, result.error);
  }
}
```

---

## Common Patterns & Anti-Patterns

### ✅ DO: Use Interfaces for Common Patterns

```typescript
// GOOD: Define once, implement many times
interface EntityBase<T> {
  get(id: string): Promise<T | null>;
  create(data: unknown): Promise<T>;
}

class IssueEntity implements EntityBase<Issue> { }
class LabelEntity implements EntityBase<Label> { }
```

### ❌ DON'T: Define Interfaces Without Purpose

```typescript
// BAD: Interface with single implementation
interface IOnlyOneImplementation {
  doSomething(): void;
}

class OnlyImplementation implements IOnlyOneImplementation { }
```

### ✅ DO: Use Functional for Pure Operations

```typescript
// GOOD: Pure functions for transformations
export const Transformers = {
  issueToCSV: (issue: Issue): string => 
    `"${issue.id}","${issue.title}"`,
} as const;
```

### ❌ DON'T: Use Classes for Simple Utilities

```typescript
// BAD: Class for stateless operations
class IssueValidator {
  isValid(issue: Issue): boolean {
    return issue.title.length > 0;
  }
}
```

### ✅ DO: Use Discriminated Unions for Errors

```typescript
// GOOD: Type-safe error handling
type Result<T> = 
  | { ok: true; value: T }
  | { ok: false; error: string };

function handle(result: Result<Issue>) {
  if (result.ok) {
    console.log(result.value);  // TypeScript knows value exists
  } else {
    console.log(result.error);   // TypeScript knows error exists
  }
}
```

### ❌ DON'T: Use try/catch Everywhere

```typescript
// BAD: Error handling mixed with logic
async function complexOperation() {
  try {
    const a = await stepA();
    try {
      const b = await stepB(a);
      try {
        return await stepC(b);
      } catch (e) { /* handle */ }
    } catch (e) { /* handle */ }
  } catch (e) { /* handle */ }
}
```

---

## Summary

This architecture provides:

1. **Clear Boundaries** - Each service belongs to exactly one entity
2. **Type Safety** - Interfaces and generics ensure consistency
3. **Functional + OOP** - Use the right tool for each job
4. **Clean Testing** - Each layer can be tested in isolation
5. **Great UX** - API facades provide convenient, permission-checked access
6. **Maintainability** - Changes are localized to appropriate layers

Remember the fundamental rules:
- **Entities own data**
- **Workflows own relationships** 
- **API Facades own UX**
- **Use OOP for domain, Functional for utilities**
- **Interfaces for contracts, Generics for reusability**
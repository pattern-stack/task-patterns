# LIN-008: Implement WorkflowStateService

**Status**: `todo`  
**Priority**: `medium`  
**Estimate**: S (2 points)  
**Labels**: `feature`, `service`, `workflows`  
**Team**: Engineering  

## Description

Create WorkflowStateService to manage team-specific workflow states that define the issue lifecycle (Todo, In Progress, Done, etc.).

## Implementation Details

### File: `src/features/workflow-state/service.ts`

```typescript
export class WorkflowStateService {
  // Read operations (states are team-managed, not created via API)
  async get(id: string): Promise<WorkflowState | null>
  async list(filter?: WorkflowStateFilter, pagination?: Pagination): Promise<WorkflowStateConnection>
  async listByTeam(teamId: string): Promise<WorkflowStateConnection>
  
  // Update operations (limited)
  async update(id: string, data: WorkflowStateUpdate): Promise<WorkflowState>
  async archive(id: string): Promise<boolean>
  
  // Query operations
  async getByType(teamId: string, type: WorkflowStateType): Promise<WorkflowState[]>
  async getDefault(teamId: string, category: 'triage' | 'backlog' | 'started'): Promise<WorkflowState | null>
  
  // Issue operations
  async getIssues(stateId: string, filter?: IssueFilter): Promise<IssueConnection>
  async moveIssues(fromStateId: string, toStateId: string): Promise<BatchResult>
  
  // Workflow analysis
  async getTransitions(teamId: string): Promise<WorkflowTransition[]>
  async validateTransition(issueId: string, toStateId: string): Promise<boolean>
}
```

### Schemas

```typescript
export const WorkflowStateUpdateSchema = z.object({
  name: z.string().optional(),
  color: z.string().optional(),
  description: z.string().optional(),
  position: z.number().optional(),
});

export const WorkflowStateFilterSchema = z.object({
  teamId: z.string().optional(),
  type: z.enum(['triage', 'backlog', 'unstarted', 'started', 'completed', 'canceled']).optional(),
  name: z.object({
    eq: z.string().optional(),
    contains: z.string().optional(),
  }).optional(),
});

export interface WorkflowTransition {
  from: WorkflowState;
  to: WorkflowState;
  count: number;
  averageDuration: number;
}
```

## Acceptance Criteria

- [ ] Retrieve workflow states by ID or team
- [ ] Filter states by type/category
- [ ] Update state properties (name, color, position)
- [ ] Get issues in specific workflow state
- [ ] Validate state transitions
- [ ] Analyze workflow transitions
- [ ] Unit tests with mocked data
- [ ] Handle team-specific workflow configurations

## Dependencies

- Linear SDK WorkflowState model
- TeamService (for team validation)
- IssueService (for issue queries)

## Notes

- Workflow states are created/managed in Linear UI
- Each team has its own set of workflow states
- States have types: triage, backlog, unstarted, started, completed, canceled
- State transitions can have rules/restrictions
- Position determines order in UI
# LIN-003: Implement LabelService

**Status**: `done` ✅  
**Priority**: `medium`  
**Estimate**: S (2 points)  
**Labels**: `feature`, `service`, `organization`  
**Team**: Engineering  

## Description

Create LabelService for managing issue categorization through labels. Labels are workspace-wide or team-specific tags.

## Implementation Details

### File: `src/features/label/service.ts`

```typescript
export class LabelService {
  // CRUD operations
  async create(data: LabelCreate): Promise<IssueLabel>
  async update(id: string, data: LabelUpdate): Promise<IssueLabel>
  async delete(id: string): Promise<boolean>
  async get(id: string): Promise<IssueLabel | null>
  async getByName(name: string, teamId?: string): Promise<IssueLabel | null>
  
  // Listing
  async list(filter?: LabelFilter, pagination?: Pagination): Promise<IssueLabelConnection>
  async listByTeam(teamId: string): Promise<IssueLabelConnection>
  
  // Issue operations
  async addToIssue(issueId: string, labelId: string): Promise<Issue>
  async removeFromIssue(issueId: string, labelId: string): Promise<Issue>
  async getIssues(labelId: string, pagination?: Pagination): Promise<IssueConnection>
  
  // Bulk operations
  async bulkAddToIssues(issueIds: string[], labelId: string): Promise<BatchResult>
  async mergeLLabels(sourceId: string, targetId: string): Promise<IssueLabel>
}
```

### Schemas

```typescript
export const LabelCreateSchema = z.object({
  name: z.string().min(1).max(30),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  description: z.string().optional(),
  teamId: z.string().optional(), // null for workspace-wide
  parentId: z.string().optional(), // For label hierarchy
});

export const LabelUpdateSchema = z.object({
  name: z.string().min(1).max(30).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  description: z.string().optional(),
});
```

## Acceptance Criteria

- [ ] CRUD operations for labels
- [ ] Support workspace-wide and team-specific labels
- [ ] Color validation (hex format)
- [ ] Apply/remove labels from issues
- [ ] Bulk labeling operations
- [ ] Label merging functionality
- [ ] Unit tests covering all operations
- [ ] Prevent duplicate label names within scope

## Dependencies

- Linear SDK IssueLabel model
- IssueService (for label application)
- TeamService (for team validation)

## Notes

- Labels can be hierarchical (parent/child)
- Workspace labels are available to all teams
- Team labels only visible within that team
- Label colors default to Linear's palette if not specified
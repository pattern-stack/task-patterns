# LIN-005: Complete TeamService CRUD Operations

**Status**: `todo`  
**Priority**: `medium`  
**Estimate**: S (2 points)  
**Labels**: `enhancement`, `service`, `teams`  
**Team**: Engineering  

## Description

Complete the TeamService implementation by adding create, update, and delete operations, plus team-specific resource methods.

## Implementation Details

### File: `src/features/team/service.ts` (additions)

```typescript
export class TeamService {
  // Existing methods...
  
  // NEW: CRUD operations
  async create(data: TeamCreate): Promise<Team>
  async update(id: string, data: TeamUpdate): Promise<Team>
  async delete(id: string): Promise<boolean>
  async merge(sourceId: string, targetId: string): Promise<Team>
  
  // NEW: Team resources
  async getWorkflowStates(teamId: string): Promise<WorkflowStateConnection>
  async getCycles(teamId: string, filter?: CycleFilter): Promise<CycleConnection>
  async getProjects(teamId: string, filter?: ProjectFilter): Promise<ProjectConnection>
  async getLabels(teamId: string): Promise<IssueLabelConnection>
  async getMembers(teamId: string): Promise<UserConnection>
  async getWebhooks(teamId: string): Promise<WebhookConnection>
  
  // NEW: Team settings
  async getSettings(teamId: string): Promise<TeamSettings>
  async updateSettings(teamId: string, settings: TeamSettingsUpdate): Promise<TeamSettings>
  
  // NEW: Templates
  async getIssueTemplates(teamId: string): Promise<TemplateConnection>
  async createIssueTemplate(teamId: string, template: TemplateCreate): Promise<Template>
}
```

### Schemas

```typescript
export const TeamCreateSchema = z.object({
  name: z.string().min(1),
  key: z.string().min(2).max(5).toUpperCase(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  cyclesEnabled: z.boolean().optional(),
  cycleStartDay: z.number().min(0).max(6).optional(),
  cycleDuration: z.number().min(1).optional(),
  triageEnabled: z.boolean().optional(),
});

export const TeamUpdateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  cyclesEnabled: z.boolean().optional(),
  triageEnabled: z.boolean().optional(),
  private: z.boolean().optional(),
});
```

## Acceptance Criteria

- [ ] Create new teams with validation
- [ ] Update team settings and metadata
- [ ] Delete teams (with cascade handling)
- [ ] Retrieve team-specific resources
- [ ] Workflow state management per team
- [ ] Team templates functionality
- [ ] Unit tests for all new methods
- [ ] Handle team key uniqueness

## Dependencies

- Existing TeamService base
- Linear SDK Team model
- Related services (Cycle, Project, Label, User)

## Notes

- Team keys must be unique workspace-wide
- Deleting teams requires admin permissions
- Some settings affect issue workflows
- Teams can have custom workflow states
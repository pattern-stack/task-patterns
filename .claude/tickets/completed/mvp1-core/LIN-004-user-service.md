# LIN-004: Implement UserService

**Status**: `todo`  
**Priority**: `high`  
**Estimate**: M (3 points)  
**Labels**: `feature`, `service`, `users`  
**Team**: Engineering  

## Description

Implement comprehensive UserService for managing Linear users, including viewer operations, team membership, and user-related queries.

## Implementation Details

### File: `src/features/user/service.ts`

```typescript
export class UserService {
  // User retrieval
  async get(id: string): Promise<User | null>
  async getViewer(): Promise<User> // Current authenticated user
  async getByEmail(email: string): Promise<User | null>
  async list(filter?: UserFilter, pagination?: Pagination): Promise<UserConnection>
  
  // User updates (limited by permissions)
  async update(id: string, data: UserUpdate): Promise<User>
  async updateViewer(data: UserUpdate): Promise<User>
  
  // Related data
  async getAssignedIssues(userId: string, filter?: IssueFilter): Promise<IssueConnection>
  async getCreatedIssues(userId: string, filter?: IssueFilter): Promise<IssueConnection>
  async getComments(userId: string, pagination?: Pagination): Promise<CommentConnection>
  
  // Team operations
  async getTeams(userId: string): Promise<TeamConnection>
  async addToTeam(userId: string, teamId: string): Promise<TeamMembership>
  async removeFromTeam(userId: string, teamId: string): Promise<boolean>
  
  // Settings and preferences
  async getSettings(userId: string): Promise<UserSettings>
  async updateSettings(userId: string, settings: UserSettingsUpdate): Promise<UserSettings>
}
```

### Schemas

```typescript
export const UserUpdateSchema = z.object({
  displayName: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  timezone: z.string().optional(),
  statusEmoji: z.string().optional(),
  statusLabel: z.string().optional(),
  statusUntilAt: z.string().datetime().optional(),
});

export const UserFilterSchema = z.object({
  active: z.boolean().optional(),
  admin: z.boolean().optional(),
  teamId: z.string().optional(),
  email: z.object({
    eq: z.string().email().optional(),
    contains: z.string().optional(),
  }).optional(),
});
```

## Acceptance Criteria

- [ ] Retrieve user by ID, email, or as viewer
- [ ] List users with filtering options
- [ ] Update user profile (respecting permissions)
- [ ] Fetch user's assigned and created issues
- [ ] Team membership management
- [ ] User settings and preferences
- [ ] Unit tests with mocked data
- [ ] Handle guest users appropriately

## Dependencies

- Linear SDK User model
- IssueService (for issue queries)
- TeamService (for membership)
- CommentService (for user comments)

## Notes

- Most user fields are read-only via API
- Only certain fields can be updated (displayName, avatar, status)
- Admin operations require admin scope
- Guest users have limited permissions
- Viewer operations don't require user ID
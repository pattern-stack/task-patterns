# MVP-001: Implement IssueManager Tool

**Status**: `todo`  
**Priority**: `high`  
**Estimate**: L (5 points)  
**Labels**: `mvp`, `tool`, `issue-management`  
**Team**: Engineering  

## Description

Implement the IssueManager tool - the primary interface for 60% of daily Linear interactions. This high-level abstraction wraps existing atomic services to provide intuitive issue management.

## Implementation Details

### File: `src/organisms/tools/issue-manager.tool.ts`

```typescript
export class IssueManagerTool {
  constructor(
    private issueService: IssueService,
    private commentService: CommentService,
    private teamService: TeamService,
    private userService: UserService,
    private labelService: LabelService
  ) {}

  async quickCreate(
    title: string, 
    teamKey: string, 
    options?: QuickCreateOptions
  ): Promise<IssueCreationResult>

  async moveToStatus(
    issueIdentifiers: string[],
    status: string,
    comment?: string
  ): Promise<BulkUpdateResult>

  async smartSearch(
    query: string,
    options?: SmartSearchOptions
  ): Promise<SmartSearchResult>

  async bulkAssign(
    issueIdentifiers: string[],
    assigneeEmail: string
  ): Promise<BulkUpdateResult>

  async addQuickComment(
    issueIdentifier: string,
    comment: string,
    options?: CommentOptions
  ): Promise<Comment>
}
```

### Supporting Types

```typescript
export interface QuickCreateOptions {
  description?: string;
  priority?: IssuePriority;
  assignee?: string; // Email or username
  labels?: string[]; // Label names
  project?: string; // Project name
  parent?: string; // Parent issue identifier
}

export interface IssueCreationResult {
  issue: Issue;
  url: string;
  identifier: string; // "ENG-123"
  warnings?: string[];
}

export interface SmartSearchOptions {
  team?: string;
  assignee?: string;
  status?: string[];
  priority?: string[];
  limit?: number;
}

export interface SmartSearchResult {
  issues: Issue[];
  totalCount: number;
  parsedQuery: string;
  appliedFilters: Record<string, any>;
}

export interface BulkUpdateResult {
  updated: Issue[];
  failed: { identifier: string; error: string }[];
  summary: string;
}
```

### Helper: `src/molecules/helpers/issue-identifier-resolver.ts`

```typescript
export class IssueIdentifierResolver {
  constructor(private issueService: IssueService) {}

  // Resolve "ENG-123", "#123", "123", or UUID to Issue
  async resolveIdentifier(identifier: string): Promise<Issue | null>
  
  // Bulk resolve multiple identifiers
  async resolveIdentifiers(identifiers: string[]): Promise<{
    resolved: Map<string, Issue>;
    unresolved: string[];
  }>
  
  // Parse team key from identifier
  parseTeamKey(identifier: string): string | null
  
  // Format issue as identifier
  formatIdentifier(issue: Issue): Promise<string>
}
```

### Helper: `src/molecules/helpers/smart-search-parser.ts`

```typescript
export class SmartSearchParser {
  // Parse natural language queries like:
  // "high priority bugs assigned to me"
  // "todo items in ENG team"
  // "issues updated this week"
  
  parse(query: string): ParsedQuery
  
  applyContext(parsed: ParsedQuery, context: SearchContext): EnhancedQuery
  
  buildLinearFilter(enhanced: EnhancedQuery): IssueFilter
}

interface ParsedQuery {
  keywords: string[];
  filters: {
    priority?: string[];
    status?: string[];
    assignee?: string[];
    team?: string[];
    timeframe?: string;
  };
  sorting?: string;
}
```

## CLI Integration

### Commands: `src/organisms/cli/commands/issue-manager.commands.ts`

```bash
# Quick creation
linear create "Fix login bug" --team eng --assign john@company.com --priority high

# Bulk status moves
linear move ENG-123 ENG-124 ENG-125 --to "In Review" --comment "Ready for review"

# Smart search
linear search "high priority bugs assigned to me" --team eng --limit 10

# Bulk assignment
linear assign ENG-123 ENG-124 --to john@company.com

# Quick commenting
linear comment ENG-123 "Added fix, please test"
```

## Acceptance Criteria

- [ ] Quick issue creation with smart team/user resolution
- [ ] Bulk status updates with validation
- [ ] Natural language search parsing
- [ ] Identifier resolution (ENG-123, #123, UUID)
- [ ] Bulk assignment with conflict detection
- [ ] Error handling with user-friendly messages
- [ ] Performance: <500ms for single operations, <2s for bulk
- [ ] CLI commands with intuitive syntax
- [ ] Unit tests covering all methods
- [ ] Integration tests with real Linear data (when available)

## Dependencies

- Existing IssueService, CommentService, TeamService
- UserService for assignee resolution
- LabelService for label operations
- Enhanced CLI command framework

## Notes

- Focus on common workflows first
- Provide intelligent defaults
- Clear error messages for failed bulk operations
- Support both email and username for user references
- Handle partial failures gracefully in bulk operations
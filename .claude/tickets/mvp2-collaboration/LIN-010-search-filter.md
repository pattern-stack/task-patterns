# LIN-010: Add Advanced Search & Filter Capabilities

**Status**: `todo`  
**Priority**: `high`  
**Estimate**: M (3 points)  
**Labels**: `enhancement`, `search`, `performance`  
**Team**: Engineering  

## Description

Enhance all services with advanced filtering capabilities and implement cross-entity search functionality using Linear's GraphQL filter system.

## Implementation Details

### File: `src/atoms/filters/filter-builder.ts`

```typescript
export class FilterBuilder<T> {
  private filter: any = {};
  
  // Comparison operators
  eq(field: string, value: any): this
  neq(field: string, value: any): this
  in(field: string, values: any[]): this
  nin(field: string, values: any[]): this
  
  // String operators
  contains(field: string, value: string): this
  notContains(field: string, value: string): this
  startsWith(field: string, value: string): this
  endsWith(field: string, value: string): this
  
  // Numeric operators
  gt(field: string, value: number): this
  gte(field: string, value: number): this
  lt(field: string, value: number): this
  lte(field: string, value: number): this
  
  // Date operators
  before(field: string, date: Date | string): this
  after(field: string, date: Date | string): this
  dateRange(field: string, start: Date, end: Date): this
  
  // Null checks
  isNull(field: string): this
  isNotNull(field: string): this
  
  // Logical operators
  and(...filters: FilterBuilder<T>[]): this
  or(...filters: FilterBuilder<T>[]): this
  not(filter: FilterBuilder<T>): this
  
  // Relation filters
  has(relation: string, filter: FilterBuilder<any>): this
  every(relation: string, filter: FilterBuilder<any>): this
  some(relation: string, filter: FilterBuilder<any>): this
  
  build(): any
}
```

### File: `src/molecules/search/cross-entity-search.ts`

```typescript
export class CrossEntitySearch {
  async search(query: string, options?: SearchOptions): Promise<SearchResults> {
    const results = await Promise.all([
      this.searchIssues(query, options),
      this.searchProjects(query, options),
      this.searchUsers(query, options),
      this.searchComments(query, options),
    ]);
    
    return this.mergeAndRank(results, options);
  }
  
  async searchWithFilters(
    query: string, 
    filters: EntityFilters,
    options?: SearchOptions
  ): Promise<SearchResults>
  
  private async searchIssues(query: string, options?: SearchOptions): Promise<IssueConnection>
  private async searchProjects(query: string, options?: SearchOptions): Promise<ProjectConnection>
  private async searchUsers(query: string, options?: SearchOptions): Promise<UserConnection>
  private async searchComments(query: string, options?: SearchOptions): Promise<CommentConnection>
  
  private mergeAndRank(results: any[], options?: SearchOptions): SearchResults
}
```

### Enhanced Service Filters

```typescript
// Example: Enhanced IssueService filtering
export interface IssueFilterAdvanced {
  // Text search
  searchableContent?: {
    contains?: string;
    match?: 'all' | 'any';
  };
  
  // Complex state filters
  state?: {
    type?: WorkflowStateType;
    name?: StringFilter;
    team?: TeamFilter;
  };
  
  // Date range filters
  createdAt?: DateFilter;
  updatedAt?: DateFilter;
  completedAt?: DateFilter;
  
  // Relation filters
  assignee?: UserFilter;
  labels?: {
    some?: LabelFilter;
    every?: LabelFilter;
    none?: LabelFilter;
  };
  
  // Custom filters
  hasAttachments?: boolean;
  hasComments?: boolean;
  isBlocked?: boolean;
  isOverdue?: boolean;
  
  // Sorting
  orderBy?: IssueOrderBy;
}
```

### Usage Examples

```typescript
// Complex filter example
const filter = new FilterBuilder<Issue>()
  .contains('title', 'bug')
  .and(
    new FilterBuilder<Issue>()
      .eq('priority', 1)
      .or()
      .eq('priority', 0)
  )
  .has('labels', 
    new FilterBuilder<Label>()
      .in('name', ['critical', 'urgent'])
  )
  .after('createdAt', '-P2W') // Last 2 weeks
  .isNotNull('assignee')
  .build();

const issues = await issueService.list({ filter });
```

## Acceptance Criteria

- [ ] FilterBuilder class with all operators
- [ ] Cross-entity search implementation
- [ ] Enhanced filters for all services
- [ ] Support for nested relation filters
- [ ] Date range and relative date filters
- [ ] Full-text search capabilities
- [ ] Search result ranking algorithm
- [ ] Performance optimization for complex queries
- [ ] Unit tests for filter building
- [ ] Integration tests for search

## Dependencies

- All existing services
- Linear GraphQL filter documentation
- Zod for filter validation

## Notes

- Linear uses Relay-style filtering
- Filters can be deeply nested
- Some operators are field-specific
- Performance depends on filter complexity
- Consider caching frequently used filters
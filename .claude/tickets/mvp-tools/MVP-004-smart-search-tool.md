# MVP-004: Implement SmartSearch Tool

**Status**: `todo`  
**Priority**: `medium`  
**Estimate**: M (3 points)  
**Labels**: `mvp`, `tool`, `search`  
**Team**: Engineering  

## Description

Implement the SmartSearch tool for advanced querying, natural language search, and intelligent filtering. Enables power users to find issues quickly using flexible query syntax.

## Implementation Details

### File: `src/organisms/tools/smart-search.tool.ts`

```typescript
export class SmartSearchTool {
  constructor(
    private issueService: IssueService,
    private queryParser: QueryParser,
    private searchIndex: SearchIndex,
    private similarityEngine: SimilarityEngine
  ) {}

  async search(
    query: string,
    context?: SearchContext
  ): Promise<SmartSearchResult>
  
  async saveSearch(
    name: string,
    query: string,
    filters: SearchFilters
  ): Promise<SavedSearch>
  
  async getSavedSearches(userId?: string): Promise<SavedSearch[]>
  
  async findSimilarIssues(
    title: string,
    description?: string
  ): Promise<SimilarityResult>
  
  async buildComplexFilter(
    criteria: ComplexFilterCriteria
  ): Promise<FilterResult>
}
```

### New Molecules

### File: `src/molecules/parsers/query-parser.ts`

```typescript
export class QueryParser {
  // Parse natural language queries like:
  // "high priority bugs assigned to john created this week"
  // "todos in backend team with label API"
  // "issues blocking release-v2"
  
  parse(query: string): ParsedQuery {
    return {
      keywords: this.extractKeywords(query),
      filters: this.extractFilters(query),
      operators: this.extractOperators(query),
      sorting: this.extractSorting(query),
      confidence: this.calculateConfidence(query)
    };
  }

  // Suggest corrections for typos and invalid terms
  suggestCorrections(query: string): string[]
  
  // Build Linear-compatible filter from parsed query
  buildLinearFilter(parsed: ParsedQuery, context: SearchContext): IssueFilter

  private extractKeywords(query: string): string[]
  private extractFilters(query: string): QueryFilter[]
  private extractOperators(query: string): QueryOperator[]
  private extractSorting(query: string): SortCriteria | null
}

interface ParsedQuery {
  keywords: string[];
  filters: QueryFilter[];
  operators: QueryOperator[];
  sorting: SortCriteria | null;
  confidence: number; // 0-1, how well we parsed the query
}

interface QueryFilter {
  field: 'assignee' | 'team' | 'status' | 'priority' | 'label' | 'created' | 'updated';
  operator: 'equals' | 'contains' | 'in' | 'before' | 'after' | 'between';
  value: any;
  confidence: number;
}
```

### File: `src/molecules/engines/similarity-engine.ts`

```typescript
export class SimilarityEngine {
  // Find similar issues based on title and description
  async findSimilarIssues(
    title: string,
    description?: string,
    options?: SimilarityOptions
  ): Promise<{
    duplicates: { issue: Issue; similarity: number; reason: string }[];
    related: { issue: Issue; similarity: number; reason: string }[];
    confidence: number;
  }>

  // Calculate similarity score between two issues
  calculateSimilarity(issue1: Issue, issue2: Issue): number

  // Find issues with similar patterns (same labels, assignee, etc.)
  findPatternMatches(issue: Issue): Promise<Issue[]>

  private calculateTextSimilarity(text1: string, text2: string): number
  private calculateStructuralSimilarity(issue1: Issue, issue2: Issue): number
  private extractKeyPhrases(text: string): string[]
}
```

### File: `src/molecules/indexes/search-index.ts`

```typescript
export class SearchIndex {
  // In-memory search index for fast querying
  // Could be enhanced with external search engine later
  
  private index: Map<string, IndexedIssue[]> = new Map();
  
  async indexIssue(issue: Issue): Promise<void>
  async removeFromIndex(issueId: string): Promise<void>
  
  // Fast text search across indexed content
  async searchText(
    keywords: string[],
    options?: TextSearchOptions
  ): Promise<IndexedIssue[]>
  
  // Faceted search (filter by multiple dimensions)
  async facetedSearch(
    facets: SearchFacet[]
  ): Promise<FacetedSearchResult>
  
  // Auto-complete suggestions
  async getSuggestions(
    partialQuery: string,
    context?: SearchContext
  ): Promise<SearchSuggestion[]>

  private tokenizeContent(issue: Issue): string[]
  private buildSearchableContent(issue: Issue): string
}
```

### File: `src/molecules/storage/saved-search-storage.ts`

```typescript
export class SavedSearchStorage {
  // Simple JSON file storage for saved searches
  // Could be enhanced with database later
  
  private storageFile = '.linear-agent-searches.json';
  
  async saveSearch(search: SavedSearch): Promise<void>
  async loadSearches(userId?: string): Promise<SavedSearch[]>
  async deleteSearch(searchId: string): Promise<void>
  async updateSearch(searchId: string, updates: Partial<SavedSearch>): Promise<void>
  
  // Usage tracking
  async recordUsage(searchId: string): Promise<void>
  async getPopularSearches(limit: number): Promise<SavedSearch[]>
}
```

### Supporting Types

```typescript
export interface SmartSearchResult {
  issues: Issue[];
  totalCount: number;
  parsedQuery: ParsedQuery;
  appliedFilters: Record<string, any>;
  suggestions: SearchSuggestion[];
  executionTime: number; // ms
  facets: SearchFacet[];
}

export interface SearchSuggestion {
  type: 'correction' | 'completion' | 'filter' | 'similar-search';
  text: string;
  description: string;
  confidence: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFilters;
  userId?: string;
  createdAt: Date;
  lastUsed: Date;
  usageCount: number;
}

export interface ComplexFilterCriteria {
  teams?: string[];
  assignees?: string[];
  statuses?: string[];
  priorities?: string[];
  labels?: string[];
  dateRange?: { field: 'created' | 'updated'; from: Date; to: Date };
  customFields?: Record<string, any>;
  textSearch?: string;
}

export interface FilterResult {
  issues: Issue[];
  count: number;
  breakdown: Record<string, number>;
  appliedCriteria: ComplexFilterCriteria;
}
```

## CLI Integration

```bash
# Natural language search
linear search "high priority bugs assigned to me"
linear search "todo items in backend team created this week"

# Saved searches
linear search save "My P0 issues" --query "priority:urgent assignee:@me"
linear search list --saved
linear search run "My P0 issues"

# Similar issue detection
linear search similar --title "Login fails on mobile" --description "Users can't authenticate"

# Complex filtering
linear search filter --teams eng,design --status "In Progress" --priority high --created-after 2023-01-01

# Advanced queries with operators
linear search "assignee:john OR assignee:jane" --team backend
linear search "label:bug AND priority:high" --updated-within 7days
```

## Search Syntax

Support flexible query syntax:

```
# Basic keyword search
login bug

# Field filters
assignee:john@company.com
team:eng
status:"In Progress"
priority:high
label:bug
created:this-week
updated:>2023-01-01

# Operators
AND, OR, NOT
(parentheses for grouping)

# Special keywords
me (current user)
@me (same as me)
this-week, last-week, this-month
today, yesterday

# Sorting
sort:created-desc
sort:updated-asc
sort:priority-desc
```

## Performance Optimizations

```typescript
// Caching layer for frequent queries
export class QueryCache {
  private cache = new Map<string, CachedResult>();
  
  async getCached(queryHash: string): Promise<CachedResult | null>
  async setCached(queryHash: string, result: CachedResult): Promise<void>
  
  // Invalidate cache when issues change
  async invalidateForIssue(issueId: string): Promise<void>
}
```

## Acceptance Criteria

- [ ] Natural language query parsing with 80%+ accuracy
- [ ] Saved search functionality with usage tracking
- [ ] Similar issue detection with confidence scores
- [ ] Complex multi-criteria filtering
- [ ] Auto-complete and search suggestions
- [ ] Performance: <1s for most searches, <3s for complex queries
- [ ] Flexible search syntax with field filters
- [ ] CLI with intuitive search commands
- [ ] In-memory indexing for fast text search
- [ ] Unit tests for parsing and similarity logic
- [ ] Mock data tests for search functionality

## Dependencies

- Existing IssueService for data access
- Text processing utilities
- File system for saved search storage
- Enhanced CLI framework

## Future Enhancements

- Integration with external search engines (Elasticsearch, Algolia)
- Machine learning for search result ranking
- Collaborative filtering (searches by similar users)
- Search analytics and optimization
- Voice/natural language input

## Notes

- Start with simple in-memory indexing
- Focus on speed and accuracy for common queries
- Provide clear feedback when queries can't be parsed
- Support incremental search and real-time suggestions
- Handle large result sets with pagination
- Privacy considerations for saved searches
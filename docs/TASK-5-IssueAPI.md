# TASK-5: Build IssueAPI Facade in Molecules Layer

## Description
Build `IssueAPI` facade in molecules layer that provides high-level issue operations.

## Acceptance Criteria
- Create `IssueAPI` class in `src/molecules/apis/issue.api.ts`
- Integrate with existing `IssueEntity` for single-issue operations
- Create/integrate `IssueWorkflow` for complex multi-step operations
- Implement high-level methods for common patterns
- Write comprehensive unit tests with >80% coverage
- Add JSDoc documentation

## Methods to Implement
```ts
class IssueAPI {
  // Simple operations (delegate to IssueEntity)
  quickCreate(title: string, teamKey: string, options?: any): Promise<any> {}
  updateStatus(issueId: string, status: string): Promise<any> {}
  assign(issueId: string, assigneeEmail: string): Promise<any> {}
  addLabels(issueId: string, labelIds: string[]): Promise<any> {}

  // Complex operations (delegate to workflows)
  bulkMove(issueIds: string[], status: string, comment?: string): Promise<any> {}
  bulkAssign(issueIds: string[], assigneeEmail: string): Promise<any> {}
  smartSearch(query: string, filters?: Record<string, any>): Promise<any> {}
  createWithTemplate(templateName: string, data: Record<string, any>): Promise<any> {}
}
```

## Architecture Notes
- IssueAPI is a facade that coordinates between:
  - IssueEntity: Handles single-issue operations with validation
  - IssueWorkflow: Handles complex multi-step/cross-entity operations
- Provides a clean interface for the organisms layer (CLI commands)
- Follows the same pattern as `TeamAPI` and `LabelAPI`

## Technical Requirements
- Use dependency injection for entity and workflow
- Return user-friendly responses, not raw Linear SDK objects
- Handle errors with clear, actionable messages
- Maintain sub-second response times for simple operations

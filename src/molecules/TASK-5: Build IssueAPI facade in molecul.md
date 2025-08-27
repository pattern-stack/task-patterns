TASK-5: Build IssueAPI facade in molecules layer

  Description

  Build IssueAPI facade in molecules layer that provides high-level issue
  operations.

  Acceptance Criteria

  - Create IssueAPI class in src/molecules/apis/issue.api.ts
  - Integrate with existing IssueEntity for single-issue operations
  - Create/integrate IssueWorkflow for complex multi-step operations
  - Implement high-level methods for common patterns
  - Write comprehensive unit tests with >80% coverage
  - Add JSDoc documentation

  Methods to Implement

  class IssueAPI {
    // Simple operations (delegate to IssueEntity)
    - quickCreate(title, teamKey, options?)
    - updateStatus(issueId, status)
    - assign(issueId, assigneeEmail)
    - addLabels(issueId, labelIds[])

    // Complex operations (delegate to workflows)
    - bulkMove(issueIds[], status, comment?)
    - bulkAssign(issueIds[], assigneeEmail)
    - smartSearch(query, filters?)
    - createWithTemplate(templateName, data)
  }

  Architecture Notes

  - IssueAPI is a facade that coordinates between:
    - IssueEntity: Handles single-issue operations with validation
    - IssueWorkflow: Handles complex multi-step/cross-entity operations
  - Provides a clean interface for the organisms layer (CLI commands)
  - Follows the same pattern as TeamAPI and LabelAPI

  Technical Requirements

  - Use dependency injection for entity and workflow
  - Return user-friendly responses, not raw Linear SDK objects
  - Handle errors with clear, actionable messages
  - Maintain sub-second response times for simple operations
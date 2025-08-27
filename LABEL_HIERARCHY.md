# Task Patterns Label Hierarchy

## Overview

This document defines the standard label hierarchy for task-patterns. Labels use a two-level system (`group:label`) for consistent categorization across different backend tools (Linear, GitHub, Jira, etc.).

## Label Groups

### type: (Work Classification)
What kind of work is this?

- `type:feature` - New functionality or capability
- `type:bug` - Defect or error to fix
- `type:refactor` - Code improvement without changing functionality
- `type:docs` - Documentation updates
- `type:test` - Test creation or updates

### area: (Functional Area)
What functional area does this affect?

- `area:tasks` - Issue/task management
- `area:teams` - Team management
- `area:labels` - Label management
- `area:projects` - Project/milestone management
- `area:auth` - Authentication/authorization
- `area:sync` - Cross-tool synchronization
- `area:reporting` - Analytics and reporting

### stage: (Development Phase)
Where is this in the development lifecycle?

- `stage:design` - Planning and design phase
- `stage:implement` - Active development
- `stage:review` - Code review / PR review
- `stage:ready` - Ready for deployment

### layer: (Architecture Layer)
Which architectural layer does this touch?

- `layer:atoms` - Foundation utilities and core
- `layer:molecules` - Domain logic and API facades
- `layer:organisms` - User interfaces (CLI, etc.)
- `layer:features` - Service layer

### backend: (Tool Specificity)
Is this specific to a backend or universal?

- `backend:linear` - Linear-specific functionality
- `backend:github` - GitHub-specific functionality
- `backend:jira` - Jira-specific functionality
- `backend:agnostic` - Works across all backends

## Usage Examples

### Example 1: Adding Team Management to CLI
- `type:feature`
- `area:teams`
- `backend:agnostic`
- `layer:organisms`

### Example 2: Fixing Linear API Connection Bug
- `type:bug`
- `area:sync`
- `backend:linear`
- `layer:features`

### Example 3: Refactoring Label Management Workflow
- `type:refactor`
- `area:labels`
- `backend:agnostic`
- `layer:molecules`

## Implementation Notes

1. **Consistency**: Always use lowercase for labels
2. **Simplicity**: Don't over-label - 3-4 labels per issue is usually enough
3. **Clarity**: Choose the most specific applicable label
4. **Evolution**: This hierarchy will grow as needed, but keep it simple

## Native Field Mapping

These fields are typically native to task management tools and don't need labels:

- **Priority**: P0 (Critical), P1 (High), P2 (Medium), P3 (Low)
- **Status**: Backlog, Todo, In Progress, In Review, Done
- **Assignee**: User assignment
- **Project**: Grouping mechanism
- **Sprint/Cycle**: Time-based grouping

## Cross-Tool Compatibility

When implementing in different backends:

- **Linear**: Use two-level labels as-is (`type:feature`)
- **GitHub**: Use flat labels, may need to concatenate (`type-feature`)
- **Jira**: Map to components, labels, or custom fields as appropriate

---

*This is the canonical label hierarchy for task-patterns. When in doubt, keep it simple and clear.*
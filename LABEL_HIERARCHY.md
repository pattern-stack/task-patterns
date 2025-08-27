# Label Hierarchy for task-patterns

This document describes the label hierarchy used in the task-patterns project for categorizing and organizing issues in Linear.

## Label Categories

### Domain Labels (domain:*)
Identifies the functional area or feature domain that an issue relates to.

- **domain:tasks** - Task/issue management features
  - Issue CRUD operations
  - Status transitions
  - Priority management
  - Assignment workflows
  
- **domain:teams** - Team operations and configuration
  - Team creation and management
  - Member operations
  - Team settings and preferences
  - Workflow state configuration
  
- **domain:labels** - Label management and hierarchy
  - Label CRUD operations
  - Template application
  - Hierarchical organization
  - Bulk operations
  
- **domain:projects** - Project/milestone features
  - Project management
  - Milestone tracking
  - Project relationships
  - Timeline operations
  
- **domain:sync** - Integration/sync functionality
  - Linear API synchronization
  - Webhook processing
  - External system integration
  - Data consistency
  
- **domain:reporting** - Analytics/insights features
  - Team analytics
  - Velocity tracking
  - Progress reporting
  - Data visualization

### Layer Labels (layer:*)
Identifies which architectural layer the work relates to.

- **layer:atoms** - Foundation layer (shared utilities, base components)
  - Client management
  - Type definitions
  - Validators
  - Calculations
  
- **layer:features** - Data service layer
  - Linear SDK wrappers
  - Service implementations
  - Data transformers
  - Schema definitions
  
- **layer:molecules** - Domain logic layer
  - Entities
  - API facades
  - Workflows
  - Business logic
  
- **layer:organisms** - User interface layer
  - CLI commands
  - HTTP API endpoints
  - MCP server
  - User-facing features

### Component Labels (component:*)
Identifies specific component types within layers.

- **component:entity** - Entity components in molecules layer
- **component:api-facade** - API facade components in molecules layer
- **component:workflow** - Workflow components in molecules layer
- **component:middleware** - Middleware components

### Priority Labels (priority:*)
Indicates issue urgency and importance.

- **priority:high** - High priority, urgent issues

## Usage Guidelines

### When to Use Domain Labels
- **Always** apply at least one domain label to categorize the functional area
- Choose the most specific domain that applies
- Multiple domain labels can be used if an issue spans areas

### When to Use Layer Labels
- Apply when the work is specific to one architectural layer
- Use for refactoring or technical improvements within a layer
- Helpful for filtering work by technical scope

### When to Use Component Labels
- Apply when working on specific component types
- Useful for tracking patterns across similar components
- Helps identify component-specific technical debt

### Label Combinations
Common and recommended label combinations:

1. **Feature Implementation**
   - `domain:[area] + layer:[relevant-layers]`
   - Example: `domain:tasks + layer:molecules + layer:organisms`

2. **Bug Fixes**
   - `bug + domain:[area] + layer:[specific-layer]`
   - Example: `bug + domain:teams + layer:features`

3. **Technical Improvements**
   - `refactor + layer:[layer] + component:[type]`
   - Example: `refactor + layer:molecules + component:workflow`

4. **Documentation**
   - `docs + domain:[area]`
   - Example: `docs + domain:labels`

## Label Color Scheme
- **Domain labels**: Teal (#14b8a6) - Consistent color for all domain labels
- **Layer labels**: Green (#00b894) - Architectural layer identification
- **Component labels**: Various - Based on component type
- **Priority labels**: Red spectrum - Visual urgency indicator

## Maintenance
- Labels are managed through the `tp labels` CLI commands
- Domain labels should remain stable once established
- New domains should be discussed before creation
- Follow the `category:value` naming convention consistently

## Integration with task-patterns CLI
Use the CLI to manage labels:

```bash
# List all labels with hierarchy
tp labels list --hierarchy --team TASK

# Create new domain label
tp labels create "domain:newarea" --team TASK --description "Description" --color "#14b8a6"

# Apply label template
tp labels apply-template task-patterns --team TASK
```

## Historical Context
- Domain labels added: 2025-08-27 (TASK-2)
- Layer labels established with atomic architecture
- Component labels evolved from implementation patterns
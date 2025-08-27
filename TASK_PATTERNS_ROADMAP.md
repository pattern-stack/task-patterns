# Task Patterns Roadmap

## 🎯 Next Steps

### 1. Team Setup
- [ ] Create **task-patterns** team in Linear (team key: TP)
- [ ] Set as default team for this project
- [ ] Configure team-specific workflows and states

### 2. Label Hierarchy Design
Need to explore existing pattern-stack labels first (check BI-patterns and SpotHero for examples)

#### Proposed Structure (two-level: `group:label`)
- **type:** (issue categorization)
  - `type:feature` - New functionality
  - `type:bug` - Defects
  - `type:refactor` - Code improvements
  - `type:docs` - Documentation
  - `type:test` - Testing

- **layer:** (architectural layer)
  - `layer:atoms` - Foundation utilities
  - `layer:molecules` - Domain logic/APIs
  - `layer:organisms` - User interfaces
  - `layer:features` - Data services

- **scope:** (functional area)
  - `scope:cli` - CLI commands
  - `scope:api` - API facades
  - `scope:mcp` - MCP server
  - `scope:settings` - Configuration
  - `scope:workflow` - Workflows

- **backend:** (for multi-backend support)
  - `backend:linear`
  - `backend:github`
  - `backend:jira`

*Note: Priority and Status likely exist in Linear natively - need to map, not create*

### 3. Molecules Layer Build-out

#### Core APIs Needed (Priority Order)
1. **TeamAPI** - Team management operations
   - Create/configure teams
   - Manage team members
   - Team settings and workflows

2. **LabelAPI** - Label management with hierarchy
   - Bulk label creation
   - Label groups (two-level system)
   - Cross-tool label mapping

3. **ProjectAPI** - Project management
   - Create/manage projects
   - Project templates
   - Milestones/roadmaps

4. **WorkflowAPI** - State and workflow management
   - Custom workflows per team
   - State transitions
   - Automation rules

5. **ViewAPI** - Custom views and filters
   - Saved filters
   - Custom fields
   - View templates

### 4. Essential Workflows for AI Control

#### Team Management Workflows
- **TeamSetupWorkflow** - Complete team initialization with labels, workflows, settings
- **TeamMigrationWorkflow** - Move issues between teams

#### Label Management Workflows
- **LabelHierarchyWorkflow** - Create full label hierarchy from template
- **LabelSyncWorkflow** - Sync labels across teams/projects

#### Project Management Workflows  
- **SprintPlanningWorkflow** (exists - needs enhancement)
- **RoadmapWorkflow** - Milestone and epic management
- **TemplateWorkflow** - Issue templates for common tasks

#### Automation Workflows
- **AutoTriageWorkflow** - Auto-assign based on labels/content
- **AutoLabelWorkflow** - Smart labeling based on patterns
- **GitHubSyncWorkflow** - Sync issues with GitHub

### 5. CLI Enhancements (After Molecules)

```bash
# Team management
tp setup-team                  # Interactive team setup wizard
tp team create TP "Task Patterns"
tp team set-default TP

# Label management
tp labels create --from-template pattern-stack
tp labels list
tp labels sync --from BE --to TP

# Project management  
tp project create "v1.0"
tp project roadmap

# Templates
tp template list
tp template apply "backend-service"
```

### 6. MCP Server Design

Eventually expose all of this via MCP for other tools:
- Issue CRUD
- Team management
- Label operations
- Search and filters
- Bulk operations
- Workflow triggers

---

## 📝 Research Notes

### Existing Pattern Examples to Study:
- **BI-patterns** (INT team) - Check their label structure
- **SpotHero** (SPOT team) - Has good dbt-pattern
- **backend-patterns** (BE team) - Architecture labels

### Linear Native Fields to Map:
- Priority (0-4 or Urgent/High/Medium/Low/None)
- Status/State (per team workflows)
- Cycles (sprints)
- Projects (grouping)
- Estimates (points)

---

## 🚀 Immediate Next Session Tasks

1. Explore existing label patterns:
   ```bash
   tp context  # Make sure we're connected
   # Need to build: tp labels list --team INT
   # Need to build: tp labels list --team SPOT
   ```

2. Create task-patterns team manually in Linear

3. Start building TeamAPI facade in molecules layer

4. Design label template system

---

*This is our living document for task-patterns development. Update as we build!*
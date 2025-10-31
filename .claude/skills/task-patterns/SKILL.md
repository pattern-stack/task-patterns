---
name: Task Patterns
description: Comprehensive guide for using task-patterns (tp) CLI for Linear issue management, team coordination, and label organization. Use when managing Linear issues, configuring teams, creating/updating/organizing labels, setting up team workflows, or coordinating project work.
---

# Task Patterns

## Overview

Task Patterns (`tp`) is a TypeScript-based Linear CLI for AI-human collaborative task management. This skill helps you effectively use `tp` for:

- **Task Management**: Create, update, track, and complete Linear issues
- **Team Coordination**: Configure team filters, manage multi-team workflows
- **Label Management**: Create hierarchical labels, apply templates, bulk operations
- **Workflow Automation**: Project discovery, status updates, bulk operations

## Prerequisites

- `tp` CLI installed and available in PATH
- Linear API key configured (`.env` or `~/.task-pattern/config.json`)
- Team access in Linear workspace
- For project-specific configs: `.tp/config.json` in project root

## Core Workflows

### 1. Task Management Workflow

**Common Commands:**
```bash
tp context              # View current work (filtered by team config)
tp add "description"    # Create new issue
tp show TASK-ID         # View issue details
tp working TASK-ID      # Mark issue as in progress
tp done TASK-ID         # Mark issue as complete
tp update TASK-ID --status "In Review"  # Update status
```

**Best Practices:**
1. Start sessions with `tp context` to see current work
2. Use `tp add` when starting new features/tasks
3. Reference issue IDs in git commits: `git commit -m "feat: add feature [TASK-19]"`
4. Update status as work progresses
5. Use `tp done` when completing tasks

**Workflow Pattern:**
```bash
# Beginning of work session
tp context                          # What's in progress?
tp add "implement user auth"        # Create new task
# Returns: TASK-42

tp working TASK-42                  # Start working
# ... do the work ...
git commit -m "feat: add auth [TASK-42]"
tp done TASK-42                     # Mark complete
```

### 2. Team Configuration Workflow

**Configuration Hierarchy** (highest to lowest priority):
1. Local Project (`.tp/config.json`) - Project-specific settings
2. Global User (`~/.task-pattern/config.json`) - User preferences
3. Environment Variables - System defaults

**Setup Commands:**
```bash
tp config init                    # Create .tp/config.json
tp config teams TASK              # Set team filter (interactive)
tp config teams TASK TECH         # Filter multiple teams
tp config set defaultTeam TASK    # Set default team
tp config show                    # View merged configuration
```

**Working Directory Awareness:**
- CLI detects working directory via `TP_ORIGINAL_CWD`
- Each project can have its own `.tp/config.json`
- Team members share project config via git

**Configuration Example:**
```json
{
  "teamFilter": ["TASK", "TEMPO"],
  "defaultTeam": "TASK",
  "workspaceId": "optional_workspace_id"
}
```

**Multi-Team Coordination:**
1. Set team filters for cross-team visibility
2. Use `--team` flag to override for specific operations
3. Switch contexts by changing team filter
4. Commit `.tp/config.json` for team standardization

### 3. Label Management Workflow

**Understanding Label Scope:**
- **Workspace Labels**: No team specified (available to all teams)
- **Team Labels**: Specific to one team (requires team context)

**IMPORTANT:** Update and delete commands auto-detect team from config!

**Basic Label Operations:**
```bash
# List labels (respects team filter from config)
tp labels list                    # Show all labels
tp labels list --hierarchy        # Show hierarchical view
tp labels search "backend"        # Search by name

# Create labels
tp labels create "Bug" --color "#ff0000" --description "Bug reports"
tp labels create "type:feature" -c "#00ff00"  # Hierarchical label

# Update labels (auto-uses team from config!)
tp labels update "Epic" --color "#8B5CF6" --description "Large features"
tp labels update "Backend" -c "#EF4444" -d "Backend work" -t TEMPO  # Explicit team

# Delete labels
tp labels delete "old-label" --confirm
tp labels delete "unused" -t TEMPO  # Explicit team
```

**Hierarchical Labels:**
- Format: `category:value` (e.g., `type:bug`, `stack:frontend`)
- Creates parent category automatically
- Organizes labels into logical groups
- View with `tp labels list --hierarchy`

**Label Templates:**
```bash
tp labels templates                        # List available templates
tp labels apply-template task-patterns     # Apply template
tp labels apply-template engineering -t TEAM  # To specific team
```

**Bulk Operations:**
```bash
# Create multiple labels from file
tp labels bulk-create --from-file labels.csv

# Interactive bulk create
tp labels bulk-create
# Then enter: name,color,description (one per line)
```

**Common Label Structures:**

See [label-templates.md](label-templates.md) for detailed examples including:
- Issue Type groups (Epic, Story, Task, Subtask)
- Stack groups (Backend, Frontend, Full Stack)
- Work Type groups (Feature Dev, Bugfix, Infrastructure)
- Domain groups (project-specific areas)

### 4. Team Coordination Patterns

**Pattern 1: Individual Work Tracking**
```bash
# Start of day
tp context                        # Review assigned work

# During development
tp working TASK-19                # Signal you're on it
# ... implement ...
git commit -m "feat: add X [TASK-19]"
tp done TASK-19                   # Signal completion

# Update team
tp update TASK-19 --status "In Review"
```

**Pattern 2: Cross-Team Projects**
```bash
# Configure for multi-team visibility
tp config teams BACKEND FRONTEND

# Create coordinated issues
tp add "API endpoint for feature X" --team BACKEND
tp add "UI for feature X" --team FRONTEND

# Link dependencies in Linear UI
# Track progress across teams with tp context
```

**Pattern 3: Label-Based Organization**
```bash
# Set up team label structure
tp labels apply-template task-patterns -t MYTEAM

# Use labels for filtering and organization
# Apply labels in Linear UI or via API
# Use labels for reporting and sprint planning
```

**Pattern 4: Bulk Issue Management**

For bulk operations, use the planning slash commands:
```bash
# Create issues from YAML definition
/plan:2-create-issues issue-plan.yaml --team TASK

# Generate spec from existing issue
/plan:3-generate-spec TASK-42 --team TASK
```

See [team-workflows.md](team-workflows.md) for advanced collaboration patterns.

## Common Scenarios

### Scenario 1: Setting Up a New Project

1. **Initialize project configuration:**
   ```bash
   cd /path/to/project
   tp config init
   tp config teams MYTEAM
   ```

2. **Set up label structure:**
   ```bash
   tp labels apply-template task-patterns -t MYTEAM
   # Or create custom labels
   tp labels create "Epic" -c "#8B5CF6" -d "Large features"
   tp labels create "Story" -c "#3B82F6" -d "User stories"
   ```

3. **Create initial issues:**
   ```bash
   tp add "Project setup and infrastructure"
   tp add "Core feature implementation"
   tp add "Testing and documentation"
   ```

4. **Commit config for team:**
   ```bash
   git add .tp/config.json
   git commit -m "chore: add tp config for MYTEAM"
   ```

### Scenario 2: Updating All Team Labels

When you need to update label colors/descriptions for a team:

1. **Switch to team context:**
   ```bash
   tp config teams TEMPO
   ```

2. **Update labels (auto-detects team from config):**
   ```bash
   tp labels update "Epic" --color "#8B5CF6" --description "Large, multi-step features"
   tp labels update "Story" --color "#3B82F6" --description "Complete user-facing features"
   tp labels update "Task" --color "#10B981" --description "Individual implementation work"
   ```

3. **Verify changes:**
   ```bash
   tp labels list --hierarchy
   ```

### Scenario 3: Daily Development Workflow

1. **Morning check-in:**
   ```bash
   tp context                    # What's on my plate?
   tp show TASK-42               # Review details
   tp working TASK-42            # Start work
   ```

2. **During implementation:**
   ```bash
   # Make changes
   git add .
   git commit -m "feat: implement feature [TASK-42]"

   # Update if blocked or needs input
   tp update TASK-42 --status "Blocked"
   ```

3. **End of day:**
   ```bash
   tp done TASK-42               # Mark complete
   tp context                    # Review remaining work
   ```

### Scenario 4: Troubleshooting Label Commands

**Problem:** `tp labels update "Label" ...` returns "Label not found"

**Solution:** Labels are team-specific. The update command now auto-detects team from config:

```bash
# Check which team you're filtering
tp config show

# Ensure team filter matches label's team
tp config teams TEMPO           # Switch to correct team

# Now update will find team-specific labels
tp labels update "Label" --color "#FF0000"

# Or explicitly specify team
tp labels update "Label" --color "#FF0000" -t TEMPO
```

**Problem:** Creating duplicate labels

**Solution:** Check existing labels first:
```bash
tp labels search "feature"      # Search before creating
tp labels list --hierarchy      # View structure
```

## Configuration Reference

For detailed configuration options and examples, see [configuration-guide.md](configuration-guide.md).

**Quick Reference:**

```json
{
  "teamFilter": ["TEAM1", "TEAM2"],     // Filter issues to these teams
  "defaultTeam": "TEAM1",                // Default team for new issues
  "workspaceId": "workspace_id",         // Optional workspace ID
  "linearApiKey": "lin_api_xxx",         // API key (usually in global config)
  "backend": "linear"                    // Backend service (linear only currently)
}
```

## Tips and Best Practices

**Task Management:**
- Use `tp context` frequently to stay oriented
- Reference issue IDs in commits for traceability
- Keep issue descriptions clear and actionable
- Update status as work progresses, don't batch updates

**Team Configuration:**
- Commit `.tp/config.json` for team standardization
- Use global config (`~/.task-pattern/config.json`) for personal preferences
- Set team filters to match your current focus area
- Use `--team` flag for one-off operations outside filter

**Label Management:**
- Use hierarchical labels (`category:value`) for organization
- Apply templates for consistency across teams
- Update/delete commands respect team filter from config
- Search before creating to avoid duplicates
- Keep label names concise and descriptive

**Team Coordination:**
- Standardize label structures across team
- Use consistent naming conventions
- Link related issues in Linear UI for dependencies
- Use label-based filtering for sprint planning
- Commit config files for team alignment

## Debugging

**Enable verbose logging:**
```bash
LOG_LEVEL=debug tp context
```

**Check configuration sources:**
```bash
tp config show                  # See merged config
cat .tp/config.json            # Local project
cat ~/.task-pattern/config.json # Global user
```

**Verify team access:**
```bash
tp config teams                 # Interactive team selection shows available teams
```

**Check Linear API connection:**
```bash
tp context                      # Should fetch without errors
# If errors, check LINEAR_API_KEY in .env
```

## Related Commands

**Git Integration:**
```bash
git commit -m "feat: feature [TASK-19]"    # Reference issues
git push                                    # Team sees linked commits
```

**Planning Commands:**
```bash
/plan:1-decompose-requirements "Build auth system"
/plan:2-create-issues plan.yaml --team TASK
/plan:3-generate-spec TASK-42
```

**Build and Test:**
```bash
npm run build                   # Rebuild after tp updates
npm test                        # Run tests
tp verify                       # Not implemented yet
```

## Summary

The task-patterns CLI provides comprehensive Linear integration for:
- ✅ Individual task tracking and updates
- ✅ Multi-team coordination and filtering
- ✅ Hierarchical label organization
- ✅ Bulk operations and templates
- ✅ Project-specific configuration
- ✅ Git workflow integration

Use `tp --help` for complete command reference and `tp <command> --help` for specific command details.

For more details:
- [Label Templates and Structures](label-templates.md)
- [Team Workflow Patterns](team-workflows.md)
- [Configuration Guide](configuration-guide.md)

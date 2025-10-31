# Team Workflow Patterns

## Overview

This document describes effective collaboration patterns using task-patterns for team coordination, cross-functional work, and project management.

## Individual Workflows

### Daily Developer Workflow

**Morning Routine:**
```bash
# 1. Check what's on your plate
tp context

# 2. Review issue details
tp show TASK-42

# 3. Signal you're starting work
tp working TASK-42
```

**During Development:**
```bash
# Make changes, commit frequently
git add .
git commit -m "feat: implement feature [TASK-42]"

# Update if blocked
tp update TASK-42 --status "Blocked"

# Add comments/context in Linear UI as needed
```

**End of Day:**
```bash
# Mark work complete
tp done TASK-42

# Check remaining work
tp context

# Update status for in-progress items
tp update TASK-45 --status "In Progress"
```

### Feature Implementation Flow

```bash
# 1. Create epic for large feature
tp add "User Authentication System"
# Returns: TASK-100

# 2. Break down into stories (in Linear UI or via planning commands)
# TASK-101: Login flow
# TASK-102: Registration flow
# TASK-103: Password reset
# TASK-104: Session management

# 3. Work on each story
tp working TASK-101
# ... implement ...
git commit -m "feat: add login UI [TASK-101]"
tp done TASK-101

# 4. Track progress
tp show TASK-100    # View epic with subtasks
```

## Team Collaboration Patterns

### Pattern 1: Sprint Planning

**Setup:**
```bash
# 1. Create sprint epic
tp add "Sprint 24 - Q4 Goals"

# 2. Add sprint tasks
tp add "Implement feature A"
tp add "Fix critical bug B"
tp add "Refactor module C"

# 3. Apply labels for organization
# (Done in Linear UI or via API)
# - Type: Story, Task
# - Stack: Backend, Frontend
# - Work Type: Feature Dev, Bugfix, Refactor

# 4. Assign to team members in Linear UI
```

**During Sprint:**
```bash
# Team members track their work
tp context                    # See assigned issues
tp working TASK-XX            # Start work
# ... develop ...
tp done TASK-XX               # Complete

# Daily standups reference tp context output
```

**Sprint Review:**
```bash
# Check completion status
tp context                    # View remaining work

# Use Linear UI for:
# - Burndown charts
# - Velocity tracking
# - Retrospective planning
```

### Pattern 2: Cross-Functional Coordination

**Scenario:** Feature requires backend API + frontend UI

**Setup:**
```bash
# Backend team configuration
cd backend-repo
tp config init
tp config teams BACKEND
tp add "API: User profile endpoint"    # TASK-200

# Frontend team configuration
cd frontend-repo
tp config init
tp config teams FRONTEND
tp add "UI: User profile page"         # TASK-201

# Link issues in Linear UI:
# TASK-201 blocks on TASK-200
```

**Coordination:**
```bash
# Backend developer
tp working TASK-200
# ... implement API ...
git commit -m "feat: add profile endpoint [TASK-200]"
tp done TASK-200
tp update TASK-200 --status "In Review"

# Backend signals frontend team (Slack/Linear comment)
# "API ready for integration"

# Frontend developer
tp show TASK-200              # Check API details
tp working TASK-201
# ... implement UI against API ...
git commit -m "feat: add profile UI [TASK-201]"
tp done TASK-201
```

### Pattern 3: Multi-Team Visibility

**Scenario:** Product manager needs cross-team visibility

**Setup:**
```bash
# PM configuration
tp config init
tp config teams BACKEND FRONTEND DESIGN

# Now tp context shows issues from all three teams
tp context                    # Unified view

# Filter by team when needed
tp config teams BACKEND       # Focus on backend
tp context

tp config teams BACKEND FRONTEND DESIGN  # Restore full view
```

**Usage:**
- Track progress across teams
- Identify blockers and dependencies
- Coordinate release planning
- Report to stakeholders

## Advanced Patterns

### Pattern 4: Issue Decomposition

**Breaking Down Large Work:**

```bash
# 1. Create epic
tp add "Build Search Feature"         # TASK-300

# 2. Use planning command to decompose
/plan:1-decompose-requirements "Build semantic search with vector embeddings"
# Generates structured YAML plan

# 3. Create issues from plan
/plan:2-create-issues search-plan.yaml --team BACKEND

# 4. Track epic progress
tp show TASK-300              # Shows related issues
tp context                    # See all search-related work
```

### Pattern 5: Bulk Label Management

**Scenario:** Standardizing labels across team

**Initial Setup:**
```bash
# 1. Apply template to team
tp config teams MYTEAM
tp labels apply-template task-patterns

# 2. Verify structure
tp labels list --hierarchy

# 3. Customize for team needs
tp labels create "domain:payments" -c "#10B981" -d "Payment processing"
tp labels create "domain:analytics" -c "#3B82F6" -d "Analytics and reporting"
```

**Ongoing Maintenance:**
```bash
# Update label descriptions
tp labels update "Epic" -d "Updated description"

# Search for unused labels
tp labels search "old-"       # Find legacy labels

# Clean up
tp labels delete "old-label" --confirm
```

### Pattern 6: Configuration Standardization

**Scenario:** Ensuring team uses consistent configuration

**Setup Repository Config:**
```bash
# 1. Create project config
cd project-repo
tp config init

# 2. Set team standards
tp config set teamFilter '["MYTEAM"]'
tp config set defaultTeam "MYTEAM"

# 3. Commit to version control
git add .tp/config.json
git commit -m "chore: add tp team configuration"
git push

# 4. Team members get config automatically
# When they pull:
git pull
tp context                    # Uses team config
```

**Personal Overrides:**
```bash
# Individual developers can have personal preferences
# in ~/.task-pattern/config.json without affecting team
```

## Team Anti-Patterns (Avoid These)

### ❌ Anti-Pattern 1: No Status Updates

**Problem:**
```bash
tp working TASK-50
# ... weeks of work ...
# No status updates, team has no visibility
```

**Solution:**
```bash
tp working TASK-50
# ... day 1 ...
tp update TASK-50 --status "In Progress"

# ... encounter blocker ...
tp update TASK-50 --status "Blocked"
# Add comment in Linear UI explaining blocker

# ... resume work ...
tp update TASK-50 --status "In Progress"

# ... ready for review ...
tp done TASK-50
tp update TASK-50 --status "In Review"
```

### ❌ Anti-Pattern 2: Ignoring Team Filter

**Problem:**
```bash
# Creating issues without team context
tp add "Build feature" # Which team? Context unclear
```

**Solution:**
```bash
# Use team configuration
tp config teams BACKEND
tp add "Build API endpoint"  # Clear team ownership

# Or explicit team flag
tp add "Build UI component" --team FRONTEND
```

### ❌ Anti-Pattern 3: Label Chaos

**Problem:**
- Every developer creates ad-hoc labels
- Duplicate labels with slight variations
- No consistent color scheme
- Descriptions missing or unclear

**Solution:**
```bash
# 1. Define label structure (see label-templates.md)
# 2. Apply template to team
tp labels apply-template task-patterns -t MYTEAM

# 3. Document in team wiki
# 4. Review labels periodically
tp labels list --hierarchy

# 5. Clean up duplicates
tp labels search "backend"    # Find: backend, Backend, back-end
# Standardize to one version
```

### ❌ Anti-Pattern 4: Not Linking Related Issues

**Problem:**
```bash
# Create separate issues without showing relationships
tp add "API for feature"      # TASK-100
tp add "UI for feature"       # TASK-101
# No connection, unclear they're related
```

**Solution:**
```bash
# Create issues, then link in Linear UI:
tp add "API for feature"      # TASK-100
tp add "UI for feature"       # TASK-101

# In Linear UI:
# - Add TASK-101 "blocks on" TASK-100
# - Or make both sub-issues of an epic
# - Add cross-references in descriptions
```

## Communication Integration

### Slack Integration

**Pattern: Notify team on completion**
```bash
# Complete task
tp done TASK-42

# Post to Slack (manual or via automation)
# "✅ TASK-42 completed - User auth login flow ready for testing"
```

### Git Integration

**Pattern: Link commits to issues**
```bash
# Always reference issue ID in commits
git commit -m "feat: add user auth [TASK-42]"
git commit -m "fix: resolve login bug [TASK-43]"
git commit -m "docs: update auth guide [TASK-44]"

# Benefits:
# - Linear shows commits on issue
# - Easy to track code changes per issue
# - Better traceability in git history
```

### PR Integration

**Pattern: Reference in PR descriptions**
```markdown
## Description
Implements user authentication login flow

## Related Issues
- Closes TASK-42
- Blocks TASK-50

## Testing
- [x] Unit tests pass
- [x] Integration tests pass
- [x] Manual testing completed
```

## Metrics and Reporting

### Team Velocity Tracking

```bash
# Use Linear UI for:
# - Cycle time per issue
# - Velocity charts
# - Completion rates

# Use tp for quick checks:
tp context                    # Current sprint load
```

### Individual Productivity

```bash
# Daily check-ins
tp context                    # What am I working on?

# Weekly review
# Use Linear UI to view:
# - Issues completed this week
# - Time estimates vs actuals
# - Areas of focus
```

## Best Practices Summary

**For Individuals:**
1. ✅ Run `tp context` daily
2. ✅ Update status as work progresses
3. ✅ Reference issue IDs in commits
4. ✅ Use `tp working/done` for visibility
5. ✅ Keep issue descriptions current

**For Teams:**
1. ✅ Standardize label structures
2. ✅ Commit `.tp/config.json` for consistency
3. ✅ Link related issues in Linear UI
4. ✅ Use team filters for focused context
5. ✅ Review labels and clean up periodically

**For Organizations:**
1. ✅ Document label conventions
2. ✅ Provide templates for common patterns
3. ✅ Train team on tp workflows
4. ✅ Integrate with existing tools (Slack, git)
5. ✅ Review and iterate on processes

## Quick Reference

| Scenario | Command Pattern |
|----------|----------------|
| Start work | `tp working TASK-ID` |
| End work | `tp done TASK-ID` |
| Check status | `tp context` |
| Update status | `tp update TASK-ID --status "Status"` |
| Create issue | `tp add "Description"` |
| View details | `tp show TASK-ID` |
| Switch team | `tp config teams TEAM` |
| List labels | `tp labels list --hierarchy` |
| Update label | `tp labels update "Name" -c "#color" -d "desc"` |

## Resources

- [Label Templates](label-templates.md) - Standard label structures
- [Configuration Guide](configuration-guide.md) - Setup details
- [SKILL.md](SKILL.md) - Main skill documentation

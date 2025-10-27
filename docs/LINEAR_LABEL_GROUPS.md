# Linear Label Groups - How They Work

## Overview

Linear uses a **parent-child label hierarchy** where labels with the same parent form **exclusive groups**. An issue can only have **ONE label from each parent group**.

## Key Concepts

### 1. Parent Labels (Group Headers)
These labels act as category headers and define exclusive groups:
- **Issue Type** - Type of work
- **Work Type** - Nature of the work
- **Architecture Layer** - Code layer affected
- **Component** - System component

### 2. Child Labels (Group Members)
Labels that belong to a parent group. Only one can be applied per issue.

### 3. Standalone Labels
Labels without a parent can be combined freely with any other labels.

## Label Groups in This Project

Based on exploration of the TASK team labels:

### Issue Type Group (Exclusive)
Choose **ONE**:
- `docs` - Documentation work
- `Chore` - Maintenance tasks
- `Bug` - Bug fixes
- `Subtask` - Sub-task of another issue
- `Task` - General task
- `Epic` - Large feature/project

### Work Type Group (Exclusive)
Choose **ONE**:
- `Enhancement` - New functionality
- `Bugfix` - Fixing defects
- `Cleanup` - Code cleanup
- `Refactor` - Code restructuring
- `Implementation` - Feature implementation
- `Migration` - Data/code migration

### Architecture Layer Group (Exclusive)
Choose **ONE**:
- `Organisms` - UI/Interface layer
- `Molecules` - Domain logic layer
- `Features` - Service layer
- `Atoms` - Foundation layer

### Component Group (Exclusive)
Choose **ONE**:
- `Documents` - Documentation
- `Backend` - Backend code
- `Frontend` - Frontend code
- `Database` - Database schema
- `MCP` - MCP server
- `API` - API endpoints
- `CLI` - Command-line interface
- `Auth` - Authentication
- `Core` - Core functionality
- `Testing` - Test infrastructure
- `Infrastructure` - DevOps/infra

### Standalone Labels
Can combine **ALL**:
- `security` - Security-related work

## Rules & Examples

### ✅ Valid Label Combinations

```bash
# One from each group + standalone
tp update TASK-15 --set-labels "Bug,Refactor,Features,CLI,security"
# Bug (Issue Type) + Refactor (Work Type) + Features (Layer) + CLI (Component) + security (Standalone)

# Subset of groups
tp update TASK-15 --set-labels "Task,Implementation"
# Task (Issue Type) + Implementation (Work Type)

# Just standalone
tp update TASK-15 --set-labels "security"
```

### ❌ Invalid Label Combinations

```bash
# Two from same group (Issue Type)
tp update TASK-15 --set-labels "Bug,Task"
# ERROR: Bug and Task are both in Issue Type group

# Two from same group (Component)
tp update TASK-15 --set-labels "CLI,Infrastructure"
# ERROR: CLI and Infrastructure are both in Component group
```

## Working with Label Groups in `tp`

### List Labels by Group

```bash
tp labels list --hierarchy
```

### Check Current Labels

```bash
tp show TASK-15
```

### Add Compatible Labels

```bash
# Add a label from an unused group
tp update TASK-15 --add-labels "Refactor"

# Add standalone label
tp update TASK-15 --add-labels "security"
```

### Replace Labels in a Group

```bash
# Replace "Bug" with "Task" (both Issue Type group)
tp update TASK-15 --set-labels "Task,Refactor,Features,CLI"
```

### Remove Labels

```bash
tp update TASK-15 --remove-labels "security"
```

## Error Messages

When you try to add a conflicting label, Linear returns:

```
Error: LabelIds not exclusive child labels
The label 'X' is in the same group as 'Y'.
Only one label in a group can be applied to an issue.
```

## Best Practices

1. **Use `--list-labels`** to see available labels before adding
2. **Use `--set-labels`** to replace labels in the same group
3. **Check current labels** with `tp show` before adding new ones
4. **Understand groups** - one label per parent group maximum
5. **Combine freely** - labels from different groups work together

## Implementation Details

### Label Resolution
The `tp` CLI resolves labels by:
1. Fetching all labels for the issue's team
2. Matching by name (case-insensitive)
3. Supporting UUID IDs for direct reference
4. Validating against Linear's group constraints

### Error Handling
When conflicts occur:
- Linear API returns explicit error messages
- The operation fails with helpful context
- No partial updates occur

## Technical Notes

### Parent Detection
```typescript
const parent = await label.parent;
if (parent) {
  // This label is part of an exclusive group
  console.log(`Label "${label.name}" belongs to group "${parent.name}"`);
}
```

### Group Constraints
- Enforced by Linear API at mutation time
- Cannot be bypassed
- Checked during `issueUpdate` mutation

## See Also

- `LINEAR_EXPLORATION_REPORT.md` - Original label exploration
- `LABEL_HIERARCHY.md` - Project label structure
- `CLI_GUIDE.md` - CLI usage guide

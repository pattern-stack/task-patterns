---
description: Create Linear epic + sub-issues from YAML/JSON
argument-hint: <definition-file> [--team=KEY] [--dry-run]
allowed-tools:
  - Bash
  - Read
  - Write
  - TodoWrite
---

# Create Issues from Definition

Create a Linear epic with sub-issues from a structured YAML/JSON definition. This command executes the mechanical work of issue creation, linking, labeling, and status setting.

## Purpose

Separates issue **creation** (mechanical) from issue **planning** (strategic). Called by `/plan` after decomposition, or used standalone for predefined issue structures.

## Variables

- `$1`: Path to definition file (YAML or JSON) OR inline YAML/JSON string
- `--team=<key>`: Team to create issues in (default: from config)
- `--dry-run`: Show what would be created without making API calls

## Definition Format

### YAML Format
```yaml
epic:
  title: "Epic: Feature name"
  description: |
    Multi-line epic description
    Including problem statement, solution, success criteria
  labels: [Epic, mvp]  # Optional
  status: Ready        # Optional, default: Backlog

  children:
    - title: "Sub-task 1: Component name"
      description: |
        Detailed description of sub-task
        Implementation details
        Parent: {will be set automatically}
      labels: [Enhancement, docs]  # Optional
      status: Ready                 # Optional

    - title: "Sub-task 2: Another component"
      description: "..."
      labels: [Task]
      status: Backlog
```

### JSON Format
```json
{
  "epic": {
    "title": "Epic: Feature name",
    "description": "Epic description",
    "labels": ["Epic"],
    "status": "Ready",
    "children": [
      {
        "title": "Sub-task 1",
        "description": "...",
        "labels": ["Enhancement"],
        "status": "Ready"
      }
    ]
  }
}
```

## Instructions

**IMPORTANT: This command should be run in a subagent to isolate verbose tp output from the main conversation.**

### Phase 1: Setup & Validation

**Step 1: Read Definition File**
- If `$1` is a file path, read the file
- If `$1` is inline YAML/JSON, parse directly
- Validate structure has `epic` key with required fields

**Step 2: Set Team Context**
```bash
# If --team flag provided, set it
tp config teams <TEAM>
# Choose option 1 (local config)

# Or use existing team from config
```

**Step 3: Discover Available Labels**
```bash
tp labels list
# Or: tp update <any-issue> --list-labels
```

Parse output to understand:
- Available labels for this team
- Label groups (if labels conflict, they're in same group)
- Store for validation

**Step 4: Validate Definition**
- Check all labels exist in team
- Warn if status values don't match Linear workflow states
- If `--dry-run`, show what would be created and exit

### Phase 2: Create Epic

**Step 5: Create Epic Issue**
```bash
tp add "<epic.title>"
```

**Capture the issue number** from output:
```
✓ Issue created: TASK-23
```

Store as `epic_issue_number`

**Step 6: Update Epic Description**
```bash
tp update <epic_issue_number> --description "<epic.description>"
```

**Step 7: Apply Epic Labels** (if provided)
```bash
tp update <epic_issue_number> --add-labels "<label1>,<label2>"
```

**Handle label errors gracefully:**
- If error about label groups, pick first label and continue
- Log warning for user review

**Step 8: Set Epic Status** (if provided and not default)
```bash
tp update <epic_issue_number> --status "<epic.status>"
```

### Phase 3: Create Children

**Step 9: Create All Child Issues**

For each child in `epic.children`:

```bash
# Create child issue
tp add "<child.title>"
# Capture issue number (e.g., TASK-24)
```

Store all child issue numbers in array

**Step 10: Update Child Descriptions**

For each child issue:
```bash
tp update <child_issue_number> --description "<child.description>

Parent: <epic_issue_number>"
```

Note: Append parent reference to description automatically

**Step 11: Link Children to Epic**

For each child issue:
```bash
tp link-parent <child_issue_number> <epic_issue_number>
```

**Step 12: Apply Child Labels** (if provided)

For each child with labels:
```bash
tp update <child_issue_number> --add-labels "<label1>,<label2>"
```

**Step 13: Set Child Status** (if provided)

For each child with status:
```bash
tp update <child_issue_number> --status "<child.status>"
```

### Phase 4: Report Results

**Step 14: Create Summary Report**

Generate JSON output for programmatic use:
```json
{
  "epic": "TASK-23",
  "children": ["TASK-24", "TASK-25", "TASK-26"],
  "links": {
    "epic": "https://linear.app/dugsapps/issue/TASK-23",
    "children": [
      "https://linear.app/dugsapps/issue/TASK-24",
      "https://linear.app/dugsapps/issue/TASK-25",
      "https://linear.app/dugsapps/issue/TASK-26"
    ]
  }
}
```

**Step 15: Display Human Summary**

```
✅ Issues Created Successfully!

Epic: TASK-23 - "Epic: Feature name"
  Status: Ready
  Labels: Epic
  View: https://linear.app/dugsapps/issue/TASK-23

Children:
  TASK-24 - "Sub-task 1: Component name" [Enhancement] [Ready]
  TASK-25 - "Sub-task 2: Another component" [Task] [Backlog]

All issues linked and ready for implementation!
```

## Implementation Pattern (Proven)

This is the **exact pattern** that successfully created TASK-23 epic with 5 children:

### 1. Team Setup
```bash
echo "1" | tp config teams TASK
# Output: ✓ Now showing issues from: TASK (local config)
```

### 2. Create Epic
```bash
tp add "Epic: task-patterns QOL improvements"
# Output: ✓ Issue created: TASK-23
```

### 3. Create Children (batch)
```bash
tp add "Add batch update operations"        # → TASK-24
tp add "Add range syntax support"           # → TASK-25
tp add "Implement tp create-epic"           # → TASK-26
tp add "Add label validation"               # → TASK-27
tp add "Add compressed output mode"         # → TASK-28
```

### 4. Link All Children
```bash
for issue in TASK-24 TASK-25 TASK-26 TASK-27 TASK-28; do
  tp link-parent $issue TASK-23
done
```

### 5. Update Descriptions
```bash
tp update TASK-23 --description "Epic description here..."
tp update TASK-24 --description "Child 1 description..."
# ... repeat for all
```

### 6. Apply Labels
```bash
tp update TASK-23 --add-labels "Epic"

for issue in TASK-24 TASK-25 TASK-26 TASK-27 TASK-28; do
  tp update $issue --add-labels "Enhancement"
done
```

### 7. Set Status
```bash
tp update TASK-23 --status "Ready"

for issue in TASK-24 TASK-25 TASK-26 TASK-27 TASK-28; do
  tp update $issue --status "Ready"
done
```

**Result:** All issues created, linked, labeled, and set to Ready in ~2 minutes

## Error Handling

### Label Conflicts
If label error occurs:
```
Error: The label 'Epic' is in the same group as 'docs'
```

**Recovery:**
1. Try first label only: `tp update TASK-23 --add-labels "Epic"`
2. Log warning: "⚠️ Could not apply all labels (label group conflict)"
3. Continue execution

### Missing Labels
If label not found:
```
✗ Some labels could not be found: mvp
```

**Recovery:**
1. Show available labels: `tp labels list`
2. Ask user to confirm or provide alternative
3. Or skip labels and continue

### API Failures
If `tp add` or `tp update` fails:
1. Log the error
2. Return partial results (issues created so far)
3. Report what succeeded and what failed

## Usage Examples

### Called from /plan
```bash
/plan "Add batch operations"
# → Generates issue-plan-batch-ops.yaml
# → Calls: /create-issues issue-plan-batch-ops.yaml
# → Returns: {epic: "TASK-100", children: ["TASK-101", "TASK-102"]}
```

### Standalone Use
```bash
/create-issues epic-definition.yaml --team TASK
```

### Dry Run
```bash
/create-issues my-epic.yaml --dry-run
# Shows what would be created without making API calls
```

## Integration with /plan

The `/plan` command should:
1. Do deep analysis and decomposition
2. Generate YAML definition file
3. Show user the proposed structure
4. Ask for approval
5. Call `/create-issues <definition-file>`
6. Receive issue numbers
7. Continue with spec generation

## Notes

- **Context Efficiency:** Running in subagent keeps verbose tp output isolated
- **Idempotent:** Can check if epic with same title exists before creating
- **Extensible:** Can add support for more fields (assignee, priority, etc.)
- **Team Agnostic:** Works with any Linear team (BE, TASK, ETL, etc.)

## Success Criteria

✅ Epic created with all metadata
✅ All children created and linked to epic
✅ Labels applied (with graceful handling of conflicts)
✅ Status set correctly
✅ Returns machine-readable JSON
✅ Human-readable summary displayed
✅ No manual intervention required (fully automated)

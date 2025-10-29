---
description: Generate detailed implementation spec from issue
argument-hint: <issue-id> [--type=TYPE] [--team=KEY] [--no-logging]
allowed-tools:
  - Bash
  - Read
  - Write
  - Grep
  - Glob
  - Task
  - TodoWrite
---

# Generate Implementation Spec

Research a codebase and create detailed implementation spec for an issue in Refinement status.

**Philosophy**: Quality specs require deep codebase understanding. Take time to research patterns, conventions, and dependencies before writing the spec.

## Purpose

Transforms high-level issue requirements into detailed, implementation-ready specifications based on thorough codebase research.

**Key Insight**: Issue creation (via `/plan`) is strategic decomposition requiring no code knowledge. Spec generation requires deep technical research of the specific codebase.

## Variables

- `$1`: Issue identifier (e.g., TASK-24)
- `--type=<type>`: Issue type (feature|bug|chore|patch) - adjusts research depth and spec structure (optional, default: feature)
- `--team=<key>`: Override team (default: TASK)
- `--codebase=<path>`: Path to codebase (default: current directory)
- `--parent-session-dir=<path>`: Subagent mode - write to parent's session directory (optional)
- `--session-id=<id>`: Linked mode - create new session linked to parent (optional)
- `--no-logging`: Disable session logging (optional)

## Read

.claude/commands/shared/session-logging.md

## Type-Specific Behavior

The `--type` parameter adjusts research depth and spec structure:

| Type | Research Time | Phases | Testing Depth | Use Case |
|------|---------------|--------|---------------|----------|
| **feature** | 10-15 min | 4 (Foundation, Core, Integration, Testing) | Extensive (unit + integration, 80%+ coverage) | New functionality |
| **bug** | 5 min | 2 (Reproduction, Fix) | Focused (reproduction + fix validation) | Fix broken behavior |
| **chore** | 2-3 min | 1-2 (Implementation, Validation) | Minimal (basic validation) | Maintenance work |
| **patch** | <5 min | 1 (Targeted Fix) | Focused (affected area only) | Quick fixes, hotfixes |

**Default**: If `--type` not specified, defaults to `feature` (most comprehensive).

**Called via Wrappers**: Typically invoked through type-specific wrappers:
- `/feature $ISSUE` → calls `/generate-spec $ISSUE --type=feature`
- `/bug $ISSUE` → calls `/generate-spec $ISSUE --type=bug`
- `/chore $ISSUE` → calls `/generate-spec $ISSUE --type=chore`
- `/patch $ISSUE` → calls `/generate-spec $ISSUE --type=patch`

## Instructions

### Phase 0: Session Setup

**If `--no-logging` flag is set, skip all session logging steps.**

**Step 1: Determine Invocation Mode**

```bash
ISSUE_ID="$1"

if [ -n "$PARENT_SESSION_DIR" ]; then
  # MODE 1: Subagent - write to parent's directory
  SESSION_MODE="subagent"
  SESSION_DIR="$PARENT_SESSION_DIR"
  PARENT_SESSION_ID=$(basename "$PARENT_SESSION_DIR")

elif [ -n "$SESSION_ID_PARAM" ]; then
  # MODE 2: Linked - create new session, link to parent
  SESSION_MODE="linked"
  PARENT_SESSION_ID="$SESSION_ID_PARAM"
  # Will generate new session ID below

else
  # MODE 3: Standalone - create new session, no parent
  SESSION_MODE="standalone"
  PARENT_SESSION_ID=""
fi
```

**Step 2: Generate Session ID (if not subagent)**

```bash
if [ "$SESSION_MODE" != "subagent" ]; then
  ISSUE_SHORT=$(echo "$ISSUE_ID" | tr '[:upper:]' '[:lower:]')
  HASH=$(openssl rand -hex 3)
  SESSION_ID="$(date +%Y-%m-%d)_generate-spec_${ISSUE_SHORT}_${HASH}"
  SESSION_DIR="agent-logs/$SESSION_ID"
fi
```

**Step 3: Create Session Directory**

```bash
if [ "$SESSION_MODE" == "subagent" ]; then
  # Subagent: create subdirectory in parent
  SUBAGENT_DIR="generate-spec"
  mkdir -p $SESSION_DIR/$SUBAGENT_DIR
  LOG_DIR="$SESSION_DIR/$SUBAGENT_DIR"
else
  # Linked or Standalone: create new top-level session
  mkdir -p $SESSION_DIR
  LOG_DIR="$SESSION_DIR"
fi
```

**Step 4: Initialize session.json**

Only if **NOT** in subagent mode:

```bash
if [ "$SESSION_MODE" != "subagent" ]; then
  cat > $SESSION_DIR/session.json <<EOF
{
  "session_id": "$SESSION_ID",
  "workflow": "generate-spec",
  "started_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "in_progress",
  "invocation_mode": "$SESSION_MODE",
  "issue_id": "$ISSUE_ID",
  "team": "$TEAM",
  "codebase": "$(basename $(pwd))",
  "context": {
    "parent_session_id": "${PARENT_SESSION_ID:-null}"
  },
  "artifacts": {},
  "phases": [],
  "errors": []
}
EOF
fi
```

**Step 5: Log Initial Request**

Only if **NOT** in subagent mode:

```bash
if [ "$SESSION_MODE" != "subagent" ]; then
  cat > $LOG_DIR/00-request.md <<EOF
# Generate Spec Request

**Issue**: $ISSUE_ID
**Team**: $TEAM
**Codebase**: $(pwd)
**Started**: $(date)
**Invocation Mode**: $SESSION_MODE
**Parent Session**: ${PARENT_SESSION_ID:-none}

## Context
Generating detailed implementation spec for issue in Refinement status.
EOF
fi
```

### Phase 1: Fetch Issue Context

**Log Phase Start:**
```bash
echo "# Phase 1: Fetch Issue Context

Started: $(date)

Fetching issue details from Linear...
" > $LOG_DIR/01-fetch-issue.md
```

**Step 6: Read Issue from Linear**

```bash
tp show $ISSUE_ID
```

**Capture and log output** to `$LOG_DIR/01-fetch-issue.md`:

Parse from output:
- **Title**: Issue title
- **Description**: Full description (problem, solution, goals)
- **Labels**: Issue labels (helps determine type)
- **Status**: Must be "Refinement" (validate this)
- **Parent**: Parent epic (for broader context)

**Append to phase log:**
```markdown
## Issue Details

- **ID**: $ISSUE_ID
- **Title**: {title}
- **Status**: {status}
- **Labels**: {labels}
- **Parent**: {parent epic if exists}

## Description
{full description}
```

**Step 5: Validate Issue Status**

If status ≠ "Refinement":
```markdown
❌ ERROR: Issue must be in Refinement status to generate spec

Current status: {status}

Please move issue to Refinement first:
  tp update $ISSUE_ID --status "Refinement"
```

Exit with error

**Step 6: Understand Issue Requirements**

From description, extract:
- **Problem statement**: What needs to be solved?
- **Solution approach**: High-level how?
- **Success criteria**: What defines done?
- **User impact**: Who benefits and how?

**Log extracted requirements** to phase log

**Update session.json:**
```json
{
  "phases": [
    {
      "name": "fetch-issue",
      "status": "completed",
      "started_at": "{timestamp}",
      "completed_at": "{timestamp}",
      "artifacts": ["01-fetch-issue.md"]
    }
  ],
  "issue_metadata": {
    "title": "{title}",
    "status": "Refinement",
    "labels": ["{labels}"]
  }
}
```

### Phase 2: Deep Codebase Research

**Log Phase Start:**
```bash
echo "# Phase 2: Deep Codebase Research

Started: $(date)

Researching codebase to understand patterns, conventions, and dependencies...

## Research Strategy
1. Project documentation
2. Architecture patterns
3. Relevant existing code
4. Testing conventions
5. Dependencies and imports
" > $LOG_DIR/02-research.md
```

**Step 7: Read Project Documentation**

Read and analyze:
```bash
# Core documentation
README.md
CLAUDE.md
ARCHITECTURE.md (if exists)
docs/ directory (if exists)
```

**Log findings to research phase:**
```markdown
## Project Overview

### Tech Stack
{languages, frameworks, tools}

### Architecture Pattern
{architectural pattern used}

### Key Conventions
{coding conventions, patterns}
```

**Step 8: Discover Project Structure**

```bash
# Use tree or ls to understand structure
tree -L 3 -I 'node_modules|venv|__pycache__|.git'
# Or: ls -R | grep ":$" | sed -e 's/:$//' -e 's/[^-][^\/]*\//--/g'
```

**Log structure understanding:**
```markdown
## Project Structure

```
{relevant directory structure}
```

Key directories:
- `{dir}`: {purpose}
- `{dir}`: {purpose}
```

**Step 9: Find Relevant Files**

Use Glob to discover files related to issue domain:

```bash
# Example patterns based on issue
Glob "**/*batch*.ts"
Glob "**/*update*.ts"
Glob "**/commands/*.ts"
```

**Log discovered files:**
```markdown
## Relevant Files Discovered

### Files to Potentially Modify
- `{file}`: {why relevant}

### Related Implementations
- `{file}`: {similar functionality}
```

**Step 10: Search for Relevant Patterns**

Use Grep to find implementation patterns:

```bash
# Example searches based on issue
Grep "update.*command" --type ts --output_mode content
Grep "batch.*operation" --type ts --output_mode content
Grep "class.*Command" --type ts --output_mode content
```

**Log pattern findings:**
```markdown
## Code Patterns Found

### Pattern: {pattern name}
Location: {file}:{line}

```{language}
{code snippet}
```

Why relevant: {explanation}
```

**Step 11: Read Existing Similar Implementations**

Read files that implement similar functionality:

```bash
Read {file-path}
```

**Log key insights:**
```markdown
## Similar Implementations

### {file}: {what it does}

Key patterns to follow:
- {pattern}
- {convention}
- {approach}

Code to reference:
{file}:{line-range}
```

**Step 12: Understand Dependencies**

From package.json, requirements.txt, go.mod, etc:

```markdown
## Dependencies

### Required for Implementation
- `{package}`: {purpose}

### May Need to Add
- `{package}`: {why}
```

**Step 13: Understand Testing Strategy**

Read test files to understand conventions:

```bash
# Find test files
Glob "**/*.test.ts"
Glob "**/*.spec.ts"
Glob "**/*_test.py"
```

**Log testing approach:**
```markdown
## Testing Conventions

### Test Framework
{framework used}

### Test Patterns
- {pattern observed}
- {convention followed}

### Example Test Structure
{file}:{lines}
```

**IMPORTANT: Spend significant time researching. Use Explore agent if needed for complex codebases.**

**Update session.json:**
```json
{
  "phases": [
    ...,
    {
      "name": "research",
      "status": "completed",
      "started_at": "{timestamp}",
      "completed_at": "{timestamp}",
      "artifacts": ["02-research.md"],
      "files_analyzed": ["{files read}"],
      "patterns_identified": ["{patterns}"]
    }
  ]
}
```

### Phase 3: Generate Specification

**Log Phase Start:**
```bash
echo "# Phase 3: Generate Specification

Started: $(date)

Creating detailed implementation spec based on research...
" > $LOG_DIR/03-generate-spec.md
```

**Step 14: Create Implementation Spec**

Generate spec file: `specs/issue-{ISSUE_ID}-{descriptive-name}.md`

Use this format:

```markdown
# {Issue Type}: {Issue Title}

## Metadata
- **Issue**: \`{ISSUE_ID}\`
- **Codebase**: \`{codebase-name}\`
- **Generated**: {timestamp}
- **Session**: \`{SESSION_ID}\`

## Issue Context

### Problem Statement
{From issue description, refined with codebase understanding}

### Solution Approach
{From issue description, with technical implementation details}

### Success Criteria
{Clear, measurable criteria from issue}

## Codebase Analysis

### Relevant Patterns
{Patterns discovered during research that apply}

### Similar Implementations
{Reference to similar code that can guide implementation}

### Architectural Constraints
{Any constraints from architecture that must be followed}

## Implementation Plan

### Phase 1: Foundation
{Setup work, shared utilities, base structures}

**Why**: {rationale}

**Tasks**:
1. {specific task}
   - File: \`{file}\`
   - Action: {what to do}
   - Pattern: {pattern to follow}

### Phase 2: Core Implementation
{Main feature/fix implementation}

**Why**: {rationale}

**Tasks**:
1. {specific task}
   - File: \`{file}\`
   - Action: {what to do}
   - Reference: {similar code to follow}

### Phase 3: Integration
{Wire into existing code, handle edge cases}

**Why**: {rationale}

**Tasks**:
1. {specific task}
   - File: \`{file}\`
   - Action: {what to do}

### Phase 4: Testing
{Test implementation following project conventions}

**Why**: {rationale}

**Tasks**:
1. {specific task}
   - File: \`{test-file}\`
   - Action: {what to test}
   - Pattern: {test pattern to follow}

## Detailed Task Breakdown

### Task 1: {First Concrete Task}

**File**: \`{file-path}\`

**Action**: {Specific action to take}

**Implementation Guidance**:
```{language}
// Pseudocode or actual code structure to follow
{guidance}
```

**Reference**: {Similar code at file:line}

**Tests**: {What tests to write}

### Task 2: {Next Task}
{Same structure...}

## File Changes

### Files to Modify

#### \`{file-path}\`
**Why**: {reason for modification}

**Changes**:
- {change description}
- {change description}

**Lines affected**: ~{estimate}

**Complexity**: {low/medium/high}

### Files to Create

#### \`{new-file-path}\`
**Why**: {purpose of new file}

**Structure**:
```{language}
{outline of file structure}
```

**Pattern**: Based on {similar-file}

## Testing Strategy

### Unit Tests

**File**: \`{test-file}\`

**Test Cases**:
1. **{test case name}**
   - Setup: {setup}
   - Action: {action}
   - Assert: {expected outcome}

2. **{test case name}**
   - Setup: {setup}
   - Action: {action}
   - Assert: {expected outcome}

### Integration Tests
{If applicable, describe integration tests}

### Edge Cases

1. **{edge case}**
   - Scenario: {description}
   - Expected: {behavior}
   - Test: {how to test}

## Dependencies

### Existing Dependencies Used
- \`{package}\`: {how it's used}

### New Dependencies Needed
{If any new packages are required}
- \`{package}\`: {why needed}
- Installation: \`{command}\`

## Validation Commands

Execute these commands to validate implementation:

```bash
# Run tests
{project-specific test command}

# Run linting
{project-specific lint command}

# Run type checking
{project-specific type-check command}

# Build
{project-specific build command}
```

All commands must pass with zero errors.

## Implementation Notes

### Important Gotchas
{Based on research, things to watch out for}

### Performance Considerations
{If applicable}

### Security Considerations
{If applicable}

### Future Enhancements
{Potential improvements for later}

## References

### Code References
- \`{file}:{line}\` - {what to reference}
- \`{file}:{line}\` - {what to reference}

### Documentation
- {doc-file} - {relevant section}

## Estimated Effort
{Based on research: small/medium/large}

## Ready for Implementation
This spec is complete and ready for \`/implement\` workflow.
```

**Step 15: Save Spec File**

Save to: `specs/issue-{ISSUE_ID}-{descriptive-name}.md`

Create descriptive name from issue title:
- Lowercase
- Replace spaces with hyphens
- Remove special characters
- Max 50 chars

Example:
- Issue: "TASK-24: Add batch update operations to tp update command"
- File: `specs/issue-TASK-24-batch-update-operations.md`

**Log spec creation:**
```markdown
## Spec Generated

**File**: specs/issue-{ISSUE_ID}-{name}.md
**Lines**: {line count}
**Sections**: {section count}

### Key Sections
- Implementation Plan: {phases} phases
- Task Breakdown: {task count} tasks
- Files Affected: {file count} files
- Test Cases: {test count} tests
```

**Update session.json:**
```json
{
  "phases": [
    ...,
    {
      "name": "generate-spec",
      "status": "completed",
      "started_at": "{timestamp}",
      "completed_at": "{timestamp}",
      "artifacts": ["03-generate-spec.md", "specs/issue-{ISSUE_ID}-{name}.md"]
    }
  ],
  "spec_file": "specs/issue-{ISSUE_ID}-{name}.md"
}
```

### Phase 4: Update Linear

**Log Phase Start:**
```bash
echo "# Phase 4: Update Linear

Started: $(date)

Updating issue with spec link and moving to Ready status...
" > $LOG_DIR/04-update-linear.md
```

**Step 16: Add Comment with Spec Link**

```bash
tp comment $ISSUE_ID "✅ Implementation spec generated!

📄 **Spec**: specs/issue-{ISSUE_ID}-{name}.md

## What's Next
This issue is now Ready for implementation. Use:
\`\`\`bash
/implement $ISSUE_ID
\`\`\`

## Spec Contents
- ✅ Detailed implementation plan
- ✅ Task breakdown with file references
- ✅ Testing strategy
- ✅ Validation commands
- ✅ Code patterns and references

Generated via /generate-spec workflow
Session: {SESSION_ID}"
```

**Log comment addition** to phase log

**Step 17: Update Status to Ready**

```bash
tp update $ISSUE_ID --status "Ready"
```

**Log status update** to phase log

**Update session.json:**
```json
{
  "phases": [
    ...,
    {
      "name": "update-linear",
      "status": "completed",
      "started_at": "{timestamp}",
      "completed_at": "{timestamp}",
      "actions": ["comment-added", "status-updated"]
    }
  ],
  "linear_updates": {
    "comment_added": true,
    "status_changed": {
      "from": "Refinement",
      "to": "Ready"
    }
  }
}
```

### Phase 5: Session Summary

**Step 18: Create Summary**

Create `$LOG_DIR/summary.md`:

```markdown
# Generate Spec Summary

**Session**: {SESSION_ID}
**Issue**: {ISSUE_ID}
**Completed**: $(date)
**Duration**: {duration}

## What Was Done

### 1. Issue Fetched
- Analyzed requirements from Linear
- Validated status (Refinement)
- Extracted problem, solution, success criteria

### 2. Codebase Researched
- Files analyzed: {count}
- Patterns identified: {list}
- Similar implementations found: {list}

### 3. Spec Generated
- **File**: specs/issue-{ISSUE_ID}-{name}.md
- **Lines**: {count}
- **Tasks**: {count}
- **Files to modify**: {count}
- **Tests to write**: {count}

### 4. Linear Updated
- ✅ Comment added with spec link
- ✅ Status changed: Refinement → Ready

## Artifacts Created

1. `specs/issue-{ISSUE_ID}-{name}.md` - Implementation spec
2. `agent-logs/{SESSION_ID}/` - Session logs
   - 00-request.md
   - 01-fetch-issue.md
   - 02-research.md
   - 03-generate-spec.md
   - 04-update-linear.md
   - summary.md
   - session.json

## Next Steps

Issue {ISSUE_ID} is now Ready for implementation:

```bash
/implement {ISSUE_ID}
```

Or review the spec first:
```bash
cat specs/issue-{ISSUE_ID}-{name}.md
```

## Session Data

Full session data: `agent-logs/{SESSION_ID}/session.json`
```

**Step 19: Finalize session.json**

Update with completion:

```json
{
  "session_id": "{SESSION_ID}",
  "workflow": "generate-spec",
  "started_at": "{start-time}",
  "completed_at": "{end-time}",
  "duration_ms": {duration},
  "status": "completed",
  "issue_id": "{ISSUE_ID}",
  "team": "{TEAM}",
  "codebase": "{codebase}",
  "artifacts": {
    "spec_file": "specs/issue-{ISSUE_ID}-{name}.md",
    "session_logs": "agent-logs/{SESSION_ID}/"
  },
  "phases": [
    {all phases with timings}
  ],
  "research_stats": {
    "files_analyzed": {count},
    "patterns_identified": {count},
    "similar_implementations_found": {count}
  },
  "spec_stats": {
    "lines": {count},
    "tasks": {count},
    "files_to_modify": {count},
    "tests_to_write": {count}
  },
  "linear_updates": {
    "comment_added": true,
    "status_changed": {"from": "Refinement", "to": "Ready"}
  }
}
```

**Step 20: Report Results**

Display to user:

```
✅ Spec Generated Successfully!

📄 **Spec**: specs/issue-{ISSUE_ID}-{name}.md
🔗 **Issue**: https://linear.app/{workspace}/issue/{ISSUE_ID}
📊 **Session**: agent-logs/{SESSION_ID}/

## Summary

- ✅ Researched {file-count} files
- ✅ Identified {pattern-count} relevant patterns
- ✅ Generated {task-count} implementation tasks
- ✅ Defined {test-count} test cases
- ✅ Updated issue status: Refinement → Ready

## Issue {ISSUE_ID} is Ready for Implementation

Next step:
```bash
/implement {ISSUE_ID}
```

Or review the spec:
```bash
cat specs/issue-{ISSUE_ID}-{name}.md
```

Session logs: agent-logs/{SESSION_ID}/
```

## Error Handling

### Issue Not in Refinement

If issue status ≠ "Refinement":
```markdown
❌ Cannot generate spec for issue in {current-status}

Issue must be in Refinement status. Current: {status}

To fix:
  tp update {ISSUE_ID} --status "Refinement"

Then retry:
  /generate-spec {ISSUE_ID}
```

### Issue Not Found

If `tp show` fails:
```markdown
❌ Issue {ISSUE_ID} not found

Please check:
- Issue ID is correct
- Team is correct (current: {TEAM})
- You have access to this issue

To change team:
  tp config teams {TEAM}
```

### Insufficient Context

If codebase research yields minimal results:
```markdown
⚠️ Warning: Limited codebase context found

Could not find sufficient similar implementations or patterns.

Spec will be more generic. Consider:
1. Manually reviewing existing code
2. Adding more details to issue description
3. Consulting team members

Continue generating spec? (y/n)
```

## Usage Examples

### Standalone Use

```bash
# Generate spec for task-patterns issue
/generate-spec TASK-24

# Generate spec for backend-patterns issue
/generate-spec BE-101 --team BE
```

### Linked to Planning Session

```bash
# Plan creates issues in Refinement
/plan "Add batch operations" --team TASK
# → Creates TASK-23 (epic) + TASK-24..28

# Generate spec for first issue
/generate-spec TASK-24 --session-id=2025-10-27_plan_batch-ops_abc123
# → Links to planning session
# → Continues session chain
```

### Batch Spec Generation

```bash
# Generate specs for all children of epic
for issue in TASK-24 TASK-25 TASK-26 TASK-27 TASK-28; do
  /generate-spec $issue
done
```

## Integration with Other Workflows

### `/plan` → `/generate-spec` → `/implement`

```bash
# 1. Strategic decomposition
/plan "Add caching system" --team BE
# → Creates BE-100 (epic) + BE-101..105 (children)
# → All in Refinement status

# 2. Generate specs (deep research)
/generate-spec BE-101  # Cache abstraction
/generate-spec BE-102  # Redis adapter
# ... for each issue

# 3. Implement
/implement BE-101
/implement BE-102
# ... for each issue
```

### Workflow States

```
Backlog → Refinement → Ready → In Progress → In Review → Done
          ↑            ↑
          /plan        /generate-spec
```

## Notes

- **Context Switching**: This command researches the CURRENT codebase (pwd). Ensure you're in the correct repo.
- **Deep Research**: Don't rush. Spend 10-15 minutes researching for quality specs.
- **Codebase Agnostic**: Works with any codebase (Python, TypeScript, Go, etc.)
- **Session Logging**: Full traceability of research process
- **Idempotent**: Can re-run to regenerate spec (overwrites existing)

## Success Criteria

✅ Issue fetched and validated (Refinement status)
✅ Codebase thoroughly researched (10+ files analyzed)
✅ Patterns identified and documented
✅ Similar implementations found and referenced
✅ Detailed spec generated with file-specific guidance
✅ Issue updated with spec link
✅ Issue moved to Ready status
✅ Session fully logged and traceable

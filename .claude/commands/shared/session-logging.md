# Session Logging - Workflow Observability

Standardized session logging for all workflow commands. Each workflow execution creates a self-contained session directory with full traceability.

## Purpose

Provide complete observability into AI workflow executions:
- What was requested
- What decisions were made
- What commands were executed
- What was created/modified
- Results and outcomes

## Session Structure

```
agent-logs/
├── {session-id}/                    ← Self-contained session directory
│   ├── session.json                 # Session metadata
│   ├── 00-request.md                # Original user request
│   ├── 01-{phase-name}.md           # Phase execution logs
│   ├── 02-{phase-name}.md
│   ├── XX-{subagent-name}/          # Subagent execution (if any)
│   │   ├── input.{yaml|json}        # Subagent input
│   │   ├── execution.log            # Full command output
│   │   └── output.{json|md}         # Subagent return value
│   └── summary.md                   # Final summary
│
└── sessions.json                    # Index of all sessions
```

## Invocation Modes

**CRITICAL**: Commands can be invoked in three distinct modes with different session behaviors.

### Mode 1: Subagent Invocation

**When**: Command is called BY another command as part of its workflow

**Parameters**: `--parent-session-dir=<path>`

**Behavior**:
- Writes **into parent's session directory**
- No new top-level session created
- Logs to subdirectory: `parent-session/{phase}-{name}/`

**Example**:
```bash
# /plan internally calls /create-issues
/create-issues issue-plan.yaml --parent-session-dir=agent-logs/abc123
```

**Result**:
```
agent-logs/abc123/                    ← Parent session
├── 04-create-issues/                 ← Subagent logs here
│   ├── input.yaml
│   ├── execution.log
│   └── output.json
└── session.json                      ← Parent tracks subagent
```

### Mode 2: Linked Standalone Invocation

**When**: User invokes command manually but wants to link to parent workflow

**Parameters**: `--session-id=<parent-id>`

**Behavior**:
- Creates **new top-level session directory**
- Records parent relationship via `parent_session_id` in session.json
- Full independent session with complete logging

**Example**:
```bash
# User calls after /plan completed
/generate-spec BE-101 --session-id=abc123
```

**Result**:
```
agent-logs/
├── abc123/                           ← Parent session
│   └── session.json
└── def456/                           ← NEW session (linked)
    ├── session.json
    │   {"parent_session_id": "abc123"}
    └── 01-fetch-issue.md
```

### Mode 3: Pure Standalone Invocation

**When**: User invokes command with no session context

**Parameters**: None

**Behavior**:
- Creates **new top-level session directory**
- No parent relationship
- Completely independent session

**Example**:
```bash
# User calls directly
/generate-spec BE-101
```

**Result**:
```
agent-logs/
└── def456/                           ← NEW session (no parent)
    ├── session.json
    │   {"parent_session_id": null}
    └── 01-fetch-issue.md
```

### Summary Table

| Mode | Invoked By | Parameter | Session Directory | Parent Linkage |
|------|------------|-----------|-------------------|----------------|
| **Subagent** | Another command | `--parent-session-dir` | Writes to parent | Updates parent's session.json |
| **Linked** | User | `--session-id` | Creates new | Records in new session.json |
| **Standalone** | User | None | Creates new | No parent |

## Session ID Format

```
{date}_{workflow}_{description}_{short-hash}
```

**Components:**
- `date`: YYYY-MM-DD format
- `workflow`: plan | implement | test | review | pr | create-issues | generate-spec
- `description`: Kebab-case description (max 30 chars)
- `short-hash`: Random 6-char alphanumeric for uniqueness

**Examples:**
- `2025-10-27_plan_redis-caching_a7f3b2`
- `2025-10-27_generate-spec_be-101_def456`
- `2025-10-27_implement_BE-101_8c9d1e`
- `2025-10-27_test_all-changes_f2a4c3`

**Generation:**
```bash
# Generate session ID
WORKFLOW="plan"
DESCRIPTION="redis-caching"
HASH=$(openssl rand -hex 3)  # Generates 6 hex chars
SESSION_ID="$(date +%Y-%m-%d)_${WORKFLOW}_${DESCRIPTION}_${HASH}"
```

## session.json Schema

```json
{
  "session_id": "2025-10-27_plan_redis-caching_a7f3b2",
  "workflow": "plan",
  "started_at": "2025-10-27T19:30:00Z",
  "completed_at": "2025-10-27T19:45:00Z",
  "status": "completed",
  "user_request": "Add Redis caching to user service",

  "context": {
    "team": "BE",
    "branch": "feature/BE-100-redis-caching",
    "parent_session_id": null
  },

  "artifacts": {
    "issues_created": ["BE-100", "BE-101", "BE-102"],
    "specs_generated": [
      "specs/issue-BE-100-epic.md",
      "specs/issue-BE-101-cache-abstraction.md"
    ],
    "files_modified": [
      "pattern_stack/atoms/cache/redis.py",
      "pattern_stack/features/users/service.py"
    ],
    "commits": ["abc123", "def456"]
  },

  "phases": [
    {
      "number": 1,
      "name": "analysis",
      "status": "completed",
      "started_at": "2025-10-27T19:30:00Z",
      "completed_at": "2025-10-27T19:33:00Z",
      "duration_ms": 180000,
      "log_file": "01-analysis.md"
    },
    {
      "number": 2,
      "name": "decomposition",
      "status": "completed",
      "duration_ms": 120000,
      "log_file": "02-decomposition.md"
    }
  ],

  "subagents": [
    {
      "name": "create-issues",
      "started_at": "2025-10-27T19:35:00Z",
      "completed_at": "2025-10-27T19:37:00Z",
      "duration_ms": 120000,
      "directory": "04-create-issues",
      "input_file": "04-create-issues/input.yaml",
      "output_file": "04-create-issues/output.json"
    }
  ],

  "errors": [],

  "metadata": {
    "model": "claude-sonnet-4",
    "total_tokens": 45000,
    "total_duration_ms": 900000
  }
}
```

## Usage in Workflow Commands

### Step 1: Add Session Parameters

Every workflow command should accept these parameters to support all invocation modes:

```markdown
## Variables
- `--parent-session-dir=<path>`: Subagent mode - write to parent's session directory (optional)
- `--session-id=<id>`: Linked mode - create new session linked to parent (optional)
- `--no-logging`: Disable session logging (optional)
```

**Parameter Logic**:
- If `--parent-session-dir` provided → **Subagent Mode** (write to parent)
- Else if `--session-id` provided → **Linked Mode** (new session, record parent)
- Else → **Standalone Mode** (new session, no parent)

### Step 2: Initialize Session (Phase 0)

Add to beginning of every workflow:

```markdown
### Phase 0: Session Initialization

**If `--no-logging` flag is set, skip all session logging.**

**Step 1: Determine Invocation Mode**

Check parameters to determine mode:

```bash
if [ -n "$PARENT_SESSION_DIR" ]; then
  # MODE 1: Subagent - write to parent's directory
  SESSION_MODE="subagent"
  SESSION_DIR="$PARENT_SESSION_DIR"
  # Extract parent session ID from path
  PARENT_SESSION_ID=$(basename "$PARENT_SESSION_DIR")

elif [ -n "$SESSION_ID_PARAM" ]; then
  # MODE 2: Linked - create new session, link to parent
  SESSION_MODE="linked"
  PARENT_SESSION_ID="$SESSION_ID_PARAM"
  # Generate new session ID (below)

else
  # MODE 3: Standalone - create new session, no parent
  SESSION_MODE="standalone"
  PARENT_SESSION_ID=""
fi
```

**Step 2: Generate Session ID (if not subagent)**

If **NOT** in subagent mode, generate new session ID:

```bash
if [ "$SESSION_MODE" != "subagent" ]; then
  WORKFLOW="{workflow-name}"
  DESCRIPTION="{extract-from-user-request}"  # Kebab-case, max 30 chars
  HASH=$(openssl rand -hex 3)
  SESSION_ID="$(date +%Y-%m-%d)_${WORKFLOW}_${DESCRIPTION}_${HASH}"
  SESSION_DIR="agent-logs/$SESSION_ID"
fi
```

**Step 3: Create Session Directory**

```bash
if [ "$SESSION_MODE" == "subagent" ]; then
  # Subagent: create subdirectory in parent
  SUBAGENT_DIR="{phase-number}-{workflow-name}"
  mkdir -p $SESSION_DIR/$SUBAGENT_DIR
  LOG_DIR="$SESSION_DIR/$SUBAGENT_DIR"
else
  # Linked or Standalone: create new top-level session
  mkdir -p $SESSION_DIR
  LOG_DIR="$SESSION_DIR"
fi
```

**Step 4: Initialize session.json**

Only create session.json if **NOT** in subagent mode:

```bash
if [ "$SESSION_MODE" != "subagent" ]; then
  cat > $SESSION_DIR/session.json <<EOF
{
  "session_id": "$SESSION_ID",
  "workflow": "{workflow-name}",
  "started_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "in_progress",
  "user_request": "{original-user-request}",
  "invocation_mode": "$SESSION_MODE",
  "context": {
    "team": "{TEAM}",
    "parent_session_id": "${PARENT_SESSION_ID:-null}"
  },
  "artifacts": {},
  "phases": [],
  "subagents": [],
  "errors": []
}
EOF
fi

# Subagents don't create session.json - they log to parent's session
```

**Step 5: Log User Request**

Only create request log if **NOT** in subagent mode:

```bash
if [ "$SESSION_MODE" != "subagent" ]; then
  cat > $LOG_DIR/00-request.md <<EOF
# User Request

{original-user-request}

## Workflow
{workflow-name}

## Invocation Mode
$SESSION_MODE

## Context
- Team: {TEAM}
- Started: $(date)
- Session ID: $SESSION_ID
- Parent Session: ${PARENT_SESSION_ID:-none}

## Arguments
{list all arguments passed to workflow}
EOF
fi

# Subagents log input to their subdirectory instead (see subagent logging)
```

**Step 5: Update sessions.json Index**

```bash
# Add this session to the index
jq '. += [{
  "session_id": "'$SESSION_ID'",
  "workflow": "{workflow-name}",
  "started_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "in_progress"
}]' agent-logs/sessions.json > agent-logs/sessions.json.tmp
mv agent-logs/sessions.json.tmp agent-logs/sessions.json
```

If sessions.json doesn't exist, create it:
```bash
echo '[]' > agent-logs/sessions.json
```
```

### Step 3: Log Each Phase

At the **start** of each phase:

```markdown
**Log Phase Start:**

```bash
PHASE_NUM="{phase-number}"
PHASE_NAME="{phase-name}"
PHASE_START=$(date -u +%Y-%m-%dT%H:%M:%SZ)

cat > agent-logs/$SESSION_ID/${PHASE_NUM}-${PHASE_NAME}.md <<EOF
# Phase ${PHASE_NUM}: {Phase Title}

Started: $PHASE_START

## Objective
{What this phase does}

## Steps
EOF
```

During phase execution, **append** to phase log:
```bash
echo "
### Step X: {Step Name}

{Decision made / command executed / result obtained}

\`\`\`bash
{command executed}
\`\`\`

Output:
\`\`\`
{command output}
\`\`\`
" >> agent-logs/$SESSION_ID/${PHASE_NUM}-${PHASE_NAME}.md
```
```

At **end** of phase:

```markdown
**Log Phase Completion:**

```bash
PHASE_END=$(date -u +%Y-%m-%dT%H:%M:%SZ)
PHASE_START_MS=$(date -d "$PHASE_START" +%s%3N)
PHASE_END_MS=$(date -d "$PHASE_END" +%s%3N)
DURATION=$((PHASE_END_MS - PHASE_START_MS))

# Append to phase log
echo "
## Completion

Ended: $PHASE_END
Duration: ${DURATION}ms
Status: completed

## Artifacts Created
- {list files/issues/etc created}
" >> agent-logs/$SESSION_ID/${PHASE_NUM}-${PHASE_NAME}.md

# Update session.json
jq '.phases += [{
  "number": '$PHASE_NUM',
  "name": "'$PHASE_NAME'",
  "status": "completed",
  "started_at": "'$PHASE_START'",
  "completed_at": "'$PHASE_END'",
  "duration_ms": '$DURATION',
  "log_file": "'${PHASE_NUM}-${PHASE_NAME}.md'"
}]' agent-logs/$SESSION_ID/session.json > agent-logs/$SESSION_ID/session.json.tmp
mv agent-logs/$SESSION_ID/session.json.tmp agent-logs/$SESSION_ID/session.json
```
```

### Step 4: Log Subagent Calls

When calling a subagent (e.g., `/create-issues`):

```markdown
**Before Subagent Call:**

```bash
SUBAGENT_NAME="{subagent-name}"
SUBAGENT_NUM="{phase-number}"
SUBAGENT_START=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Create subagent directory
mkdir -p agent-logs/$SESSION_ID/${SUBAGENT_NUM}-${SUBAGENT_NAME}

# Save input
cp {input-file} agent-logs/$SESSION_ID/${SUBAGENT_NUM}-${SUBAGENT_NAME}/input.{yaml|json}

# Call subagent, capturing output
/{subagent-command} {args} \
  --session-id=$SESSION_ID \
  --subagent-dir=${SUBAGENT_NUM}-${SUBAGENT_NAME} \
  > agent-logs/$SESSION_ID/${SUBAGENT_NUM}-${SUBAGENT_NAME}/execution.log 2>&1

# Save return value
echo "{subagent-return-value}" > agent-logs/$SESSION_ID/${SUBAGENT_NUM}-${SUBAGENT_NAME}/output.json
```

**After Subagent Completion:**

```bash
SUBAGENT_END=$(date -u +%Y-%m-%dT%H:%M:%SZ)
DURATION=$(($(date -d "$SUBAGENT_END" +%s%3N) - $(date -d "$SUBAGENT_START" +%s%3N)))

# Update session.json
jq '.subagents += [{
  "name": "'$SUBAGENT_NAME'",
  "started_at": "'$SUBAGENT_START'",
  "completed_at": "'$SUBAGENT_END'",
  "duration_ms": '$DURATION',
  "directory": "'${SUBAGENT_NUM}-${SUBAGENT_NAME}'",
  "input_file": "'${SUBAGENT_NUM}-${SUBAGENT_NAME}/input.yaml'",
  "output_file": "'${SUBAGENT_NUM}-${SUBAGENT_NAME}/output.json'"
}]' agent-logs/$SESSION_ID/session.json > agent-logs/$SESSION_ID/session.json.tmp
mv agent-logs/$SESSION_ID/session.json.tmp agent-logs/$SESSION_ID/session.json
```
```

### Step 5: Finalize Session

At the end of the workflow:

```markdown
### Final Phase: Session Finalization

**Step 1: Create Summary**

```bash
cat > agent-logs/$SESSION_ID/summary.md <<EOF
# Workflow Summary

Session: $SESSION_ID
Workflow: {workflow-name}
Status: {completed|failed}

## Request
{original-user-request}

## What Was Done
{high-level summary of work}

## Artifacts Created
{list all issues, files, commits, etc}

## Results
{final outcomes}

## Next Steps
{what to do next}
EOF
```

**Step 2: Update session.json Status**

```bash
jq '.status = "completed" |
    .completed_at = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'" |
    .metadata.total_duration_ms = {calculated-duration}' \
  agent-logs/$SESSION_ID/session.json > agent-logs/$SESSION_ID/session.json.tmp
mv agent-logs/$SESSION_ID/session.json.tmp agent-logs/$SESSION_ID/session.json
```

**Step 3: Update sessions.json Index**

```bash
jq '(.[] | select(.session_id == "'$SESSION_ID'")) |=
    (.status = "completed" | .completed_at = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'")' \
  agent-logs/sessions.json > agent-logs/sessions.json.tmp
mv agent-logs/sessions.json.tmp agent-logs/sessions.json
```

**Step 4: Display Session Location**

```
✅ Workflow Complete!

📁 Session logged: agent-logs/$SESSION_ID
📄 Summary: agent-logs/$SESSION_ID/summary.md

View full session: cat agent-logs/$SESSION_ID/session.json | jq
```
```

## Error Handling

If an error occurs during workflow execution:

```markdown
**On Error:**

```bash
ERROR_MSG="{error-message}"
ERROR_PHASE="{current-phase-name}"

# Log error to current phase
echo "
## ❌ Error Occurred

Phase: $ERROR_PHASE
Error: $ERROR_MSG

\`\`\`
{full error output}
\`\`\`
" >> agent-logs/$SESSION_ID/${PHASE_NUM}-${PHASE_NAME}.md

# Update session.json
jq '.status = "failed" |
    .completed_at = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'" |
    .errors += [{
      "phase": "'$ERROR_PHASE'",
      "message": "'$ERROR_MSG'",
      "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
    }]' agent-logs/$SESSION_ID/session.json > agent-logs/$SESSION_ID/session.json.tmp
mv agent-logs/$SESSION_ID/session.json.tmp agent-logs/$SESSION_ID/session.json

# Create error summary
echo "❌ Workflow failed. See agent-logs/$SESSION_ID for details."
```
```

## Subagent Session Context

When a subagent is called, it receives session context:

```markdown
## Variables in Subagent
- `--session-id=<id>`: Parent session ID
- `--subagent-dir=<dir>`: Subdirectory to log to (e.g., "04-create-issues")

## Subagent Logging

If `--session-id` and `--subagent-dir` provided:
  - Log to: `agent-logs/$SESSION_ID/$SUBAGENT_DIR/`
  - Do NOT create separate session
  - Do NOT update sessions.json
  - Create execution.log with all output
  - Create output.json with return value

If NOT provided:
  - Create standalone session (subagent run independently)
  - Follow full session initialization
```

## Cross-Workflow Linking

When workflows are chained (e.g., /plan → /implement):

```markdown
**Linking Sessions:**

```bash
# When calling /implement after /plan
/implement BE-101 --parent-session=$PLAN_SESSION_ID

# This creates new session with link:
{
  "session_id": "2025-10-27_implement_BE-101_8c9d1e",
  "context": {
    "parent_session_id": "2025-10-27_plan_redis-caching_a7f3b2"
  }
}
```

**Querying Workflow Chains:**

```bash
# Find all sessions for a workflow chain
jq '.[] | select(.session_id == "'$SESSION_ID'" or .context.parent_session_id == "'$SESSION_ID'")' \
  agent-logs/sessions.json
```
```

## Session Index (sessions.json)

The root-level index for quick session lookup:

```json
[
  {
    "session_id": "2025-10-27_plan_redis-caching_a7f3b2",
    "workflow": "plan",
    "started_at": "2025-10-27T19:30:00Z",
    "completed_at": "2025-10-27T19:45:00Z",
    "status": "completed",
    "user_request": "Add Redis caching to user service"
  },
  {
    "session_id": "2025-10-27_implement_BE-101_8c9d1e",
    "workflow": "implement",
    "started_at": "2025-10-27T20:00:00Z",
    "status": "in_progress",
    "user_request": "Implement BE-101: Cache abstraction layer",
    "parent_session_id": "2025-10-27_plan_redis-caching_a7f3b2"
  }
]
```

## Benefits

### For Development
- ✅ Full traceability of every workflow execution
- ✅ Debug issues by replaying sessions
- ✅ Understand AI decision-making

### For Demos
- ✅ Show exactly what the AI did
- ✅ Prove thoroughness and quality
- ✅ Demonstrate observability

### For Improvement
- ✅ Analyze successful vs failed sessions
- ✅ Identify common patterns
- ✅ Optimize workflows based on data

## Implementation Checklist

To add session logging to a workflow command:

- [ ] Add session parameters to Variables section
- [ ] Add Phase 0: Session Initialization
- [ ] Log each phase (start, during, end)
- [ ] Log subagent calls (if any)
- [ ] Add Final Phase: Session Finalization
- [ ] Handle errors with logging
- [ ] Return session ID in final output
- [ ] Test with and without logging flags

## Notes

- **Optional:** Session logging should be enabled by default but can be disabled with `--no-logging`
- **Lightweight:** Use simple bash commands, avoid heavy dependencies
- **Human-Readable:** All logs are markdown or JSON for easy reading
- **Machine-Parseable:** session.json enables programmatic analysis
- **Isolated:** Each session is completely self-contained
- **Linked:** Sessions can reference parent sessions for workflow chains

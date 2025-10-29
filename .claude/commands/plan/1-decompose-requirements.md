---
description: Decompose requirements into YAML issue plan
argument-hint: <task-description> [--auto-accept|--team=KEY]
allowed-tools:
  - AskUserQuestion
  - Bash
  - Read
  - Write
  - Grep
  - Glob
  - TodoWrite
---

# Plan - Requirements Decomposition

Analyze requirements and decompose into structured YAML definition for Linear issues.

**Philosophy**: Quality planning prevents rework. Take time to understand deeply, decompose thoughtfully, document thoroughly. **This command ONLY generates the plan** - execution happens in separate commands with full session logging.

## Purpose

Transform user requirements into structured YAML definitions:
- Interactive requirements discovery with clarifying questions
- Thoughtful decomposition using `<ultrathink>`
- YAML definition with epic + sub-issues
- Labels, descriptions, and structure specified
- **Stops at YAML** - no Linear issues created

**Next steps after `/plan`:**
1. Review YAML
2. Create issues: `/2-create-issues issue-plan.yaml`
3. Generate specs: `/feature ISSUE-ID` (for each)
4. Implement: `/implement ISSUE-ID`

## Variables

TEAM: TASK

## Read
.claude/config/project-config.md

## Arguments

- `$1`: Task description (required) - Free text description of what needs to be built (e.g., "Add Redis caching to user service", "Fix authentication timeout issue")
- `--auto-accept`: Skip approval step and generate YAML immediately
- `--team=<key>`: Override team (default: BE)

## Instructions

**IMPORTANT**: This is an INTERACTIVE command. Use `<ultrathink>` extensively and ask clarifying questions.

### Phase 1: Deep Analysis

**Step 1: Understand the Requirement**

The user has provided a task description in `$1`. This is a new requirement to decompose - there are no existing Linear issues yet.

Parse the requirement to understand:
- What is being requested? (feature, fix, improvement, etc.)
- How detailed is the description? (vague vs. specific)
- What domain or area does this affect?
- Are there any explicit constraints or requirements mentioned?

**Step 2: Ultrathink Analysis**

Use `<ultrathink>` blocks to reason about:
- What problem does this solve?
- Who are the stakeholders/users?
- What are the success criteria?
- What are the technical constraints?
- Which Atomic Architecture layer(s) are affected?
- Are there dependencies on existing code?
- What are the risks and edge cases?

**Step 3: Interactive Requirements Discovery**

Ask clarifying questions until requirements are crystal clear:
- Scope: What's included? What's explicitly excluded?
- Architecture: Which layer (Atoms/Features/Molecules/Organisms)?
- Approach: Any preferred patterns or technologies?
- Constraints: Performance requirements? Backwards compatibility?
- Dependencies: Does this block or depend on other work?
- Testing: Unit only? Integration tests needed? TDD required?

**Continue asking until you have**:
- Clear problem statement
- Clear solution approach
- Understood technical constraints
- Identified all affected components

### Phase 2: Label Discovery

**Step 4: Discover Available Labels**

Run: `tp labels list --team TASK`

Parse output for:
- **Issue types**: `type:epic`, `type:feature`, `type:bug`, `type:chore`
- **Layers**: `layer:atoms`, `layer:features`, `layer:molecules`, `layer:organisms`
- **Domains**: `domain:tasks`, `domain:teams`, `domain:sync`, etc.
- **Components**: `component:workflow`, `component:entity`, etc.
- **Priority**: `mvp`, `demo`, `priority:high`
- **TDD**: `tdd:required`, `tdd:optional`

If labels don't exist for your needs, note them for creation.

### Phase 3: Thoughtful Decomposition

**Step 5: Break Down into Epic + Sub-Issues**

Using `<ultrathink>`, decompose the requirement:

**Epic Structure**:
- Title: High-level feature name (e.g., "Add Redis caching to user service")
- Description: Problem, solution approach, success criteria
- Labels: `type:epic`, layer if applicable, domain, priority
- Estimated: Total effort (sum of sub-issues)

**Sub-Issue Structure**:
- Break into ATOMIC units (each can be implemented + tested independently)
- Each sub-issue = ONE clear deliverable
- Sequence matters: foundation → implementation → integration
- Typical breakdown:
  1. Foundation (base classes, utilities, schemas)
  2. Core implementation (models, services, APIs)
  3. Integration (wire into existing code)
  4. Testing (comprehensive test suite)

**Example Decomposition**:
```
Epic: Add batch update operations to tp CLI
├── Sub 1: Add batch issue ID parsing (Atoms)
├── Sub 2: Extend update command with batch support (Features)
├── Sub 3: Add batch status updates (Molecules)
├── Sub 4: Add batch label updates (Molecules)
└── Sub 5: Add integration tests for batch operations (Tests)
```

**Step 6: Assign Labels to Each Issue**

For each issue (epic + subs), determine:
- **Type**: epic, feature, bug, chore
- **Layer**: atoms, features, molecules, organisms (if code changes)
- **Domain**: Which domain does this affect?
- **TDD**: Is TDD required? (bugs = yes, features = optional)
- **Priority**: mvp? demo? high priority?

### Phase 4: Proposal & Approval

**Step 7: Present Structure**

Show the user:

```
Proposed Plan
=============

Epic: TASK-XXX (to be created)
Title: "Add batch update operations to tp CLI"
Labels: type:epic, layer:molecules, mvp
Description: [2-3 sentence summary]

Sub-Issues:
1. TASK-XXX+1: Add batch issue ID parsing
   Labels: type:feature, layer:atoms, tdd:optional
   Summary: Parse ranges and lists of issue IDs

2. TASK-XXX+2: Extend update command with batch support
   Labels: type:feature, layer:features, tdd:required
   Summary: Support multiple issue IDs in update command

3. TASK-XXX+3: Add batch status updates
   Labels: type:feature, layer:molecules
   Summary: Update status for multiple issues

4. TASK-XXX+4: Add batch label updates
   Labels: type:feature, layer:molecules, tdd:required
   Summary: Add/remove labels for multiple issues

5. TASK-XXX+5: Integration testing
   Labels: type:feature, layer:organisms
   Summary: Comprehensive batch operation testing

Branch: feature/TASK-XXX-batch-update-operations

Specs to be generated:
- specs/issue-TASK-XXX-batch-update-operations-epic.md
- specs/issue-TASK-XXX+1-batch-id-parsing.md
- specs/issue-TASK-XXX+2-update-command-batch.md
- specs/issue-TASK-XXX+3-batch-status-updates.md
- specs/issue-TASK-XXX+4-batch-label-updates.md
- specs/issue-TASK-XXX+5-batch-testing.md
```

**Step 8: Wait for Approval**

Unless `--auto-accept` flag is provided:
- Ask: "Does this decomposition look correct?"
- Allow user to request changes
- Iterate on the plan until approved

### Phase 5: Generate Issue Definition

**Step 9: Create YAML Definition File**

Generate `issue-plan-{epic-description}.yaml` with the approved structure:

```yaml
epic:
  title: "Epic: {epic title}"
  description: |
    {Full epic description including:
     - Problem statement
     - Solution approach
     - Success criteria
     - List of sub-issues}
  labels: [{epic labels}]  # e.g., [Epic, mvp]
  status: Refinement

  children:
    - title: "{sub-issue-1 title}"
      description: |
        {Detailed description}

        Parent: {Will be set automatically}
      labels: [{sub-issue labels}]  # e.g., [Enhancement, Task]
      status: Refinement

    - title: "{sub-issue-2 title}"
      description: |
        {Detailed description}

        Parent: {Will be set automatically}
      labels: [{labels}]
      status: Refinement

    # ... repeat for all sub-issues
```

**Important:**
- Use actual label names from `tp labels list` for the team
- Include full descriptions (not placeholders)
- Default status is `Refinement` (will change to `Ready` after specs)

### Phase 6: Summary & Next Steps

**Step 10: Save YAML File**

Write the YAML to `issue-plan-{epic-description}.yaml` in the current directory.

**Step 11: Report Results & Next Steps**

Provide summary:

```
✅ Planning Complete!

📄 **Plan File**: issue-plan-{epic-description}.yaml

## Proposed Structure

Epic: "{epic title}"
├── Sub-issue 1: "{sub-1 title}"
├── Sub-issue 2: "{sub-2 title}"
├── Sub-issue 3: "{sub-3 title}"
└── ... ({total} sub-issues)

## Next Steps

**IMPORTANT**: Run each step in a NEW context window for full session logging!

### 1. Create Issues in Linear
```bash
/create-issues issue-plan-{epic-description}.yaml
```
→ Creates epic + all sub-issues with labels
→ Returns: {epic: "BE-100", children: ["BE-101", ...]}
→ New session: 2025-XX-XX_create-issues_...

### 2. Generate Specs (for each issue)
```bash
/feature BE-100  # Epic spec
/feature BE-101  # Sub-issue 1
/feature BE-102  # Sub-issue 2
# ... for each issue
```
→ Deep research + detailed implementation plan
→ Each creates: specs/issue-BE-XXX-{name}.md
→ Each runs in NEW context with session logging

### 3. Implement (when ready)
```bash
/implement BE-101
```
→ Ensures feature branch
→ TDD workflow + quality gates
→ New session with full traceability

### 4. Create PR
```bash
/pr BE-101
```

---

**Why separate contexts?**
- Complete session logging for each phase
- Clear separation of concerns
- Can pause/resume at any point
- Full traceability from plan → implement → PR

**Plan saved**: issue-plan-{epic-description}.yaml (review before creating issues!)
```

## Workflow Philosophy

**`/plan` is ONLY for decomposition** - it stops at YAML generation.

- ✅ Interactive requirements discovery
- ✅ Thoughtful decomposition with ultrathink
- ✅ Generates structured YAML definition
- ❌ Does NOT create Linear issues
- ❌ Does NOT generate specs
- ❌ Does NOT commit anything

**Why?**
- User can review YAML before creating issues
- Each phase runs in NEW context for session logging
- Complete traceability across workflow
- Can pause/resume at any point

## Error Handling

- **If unclear requirements**: Keep asking questions, don't guess
- **If no suitable labels**: Note missing labels in YAML, user can fix before creating issues
- **If decomposition unclear**: Use ultrathink, ask for clarification

## Notes

- **Modular Design**: `/plan` only generates YAML, other commands handle execution
- **Session Logging**: Each subsequent step runs in new context for traceability
- **Label Format**: Use hierarchical names like `type:feature`, `layer:atoms`
- **Iterative**: Can re-run on same requirement to refine decomposition

## Configuration

Read `.claude/config/project-config.md` for:
- Team name
- Label conventions
- Architecture rules
- File structure

## Success Criteria

✅ Interactive planning with user
✅ Thoughtful decomposition using ultrathink
✅ YAML definition generated with complete structure
✅ Labels specified correctly
✅ Clear next steps provided
✅ User can review before creating issues

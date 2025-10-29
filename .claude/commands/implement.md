# Implement - Execute Specification with TDD Support

Follow the `Instructions` to implement the `Specs`, then `Report` the completed work.

## Variables

None required - accepts Linear issue IDs as arguments

## Read
.claude/config/project-config.md

## Arguments

- `$1, $2, $3...`: One or more Linear issue IDs (e.g., BE-101 BE-102 BE-103)
- `--tdd`: Force TDD mode (write tests first)
- `--no-tdd`: Force standard mode (implement then test)

## Instructions

**IMPORTANT**: You've just read `project-config.md` which contains all Pattern Stack context.

### Step 1: Fetch Issues from Linear

For each issue ID provided:
```bash
tp show BE-101 BE-102 BE-103 --team BE
```

Extract from output:
- Issue titles
- Issue descriptions
- Issue labels (especially `type:*`, `layer:*`, `tdd:required`)
- Issue status (should be "Ready")

### Step 2: Find Specifications

For each issue, find the corresponding spec file:
```bash
ls specs/issue-BE-101-*.md
ls specs/issue-BE-102-*.md
...
```

Read all spec files to understand:
- What needs to be implemented
- Architecture layer affected
- Step-by-step tasks
- Validation commands
- Acceptance criteria

### Step 3: Detect TDD Mode

For EACH issue individually, determine if TDD is required:

1. **Check flags first** (highest priority):
   - If `--tdd` flag: TDD mode for ALL issues
   - If `--no-tdd` flag: Standard mode for ALL issues
   - If no flags: continue to step 2

2. **Check Linear labels**:
   - If issue has `tdd:required` label: TDD mode
   - If issue has `type:bug` label: TDD mode (bugs should have regression tests)
   - Otherwise: continue to step 3

3. **Check spec content**:
   - Search spec for keywords: "TDD", "test-first", "red-green-refactor"
   - If found: TDD mode
   - Otherwise: continue to step 4

4. **Ask user**:
   - "Should I use TDD for BE-{number} ({title})?"
   - Explain: TDD = write failing test first, implement, refactor
   - Wait for yes/no

### Step 4: Implement Each Issue

For each issue, follow the mode determined above:

#### TDD Mode (Red-Green-Refactor)

**For each feature/fix in the spec**:

1. **RED - Write Failing Test**:
   - Write a test that validates the desired behavior
   - Run the test: `pytest path/to/test_file.py::test_name -xvs`
   - Verify it FAILS (this proves the test is actually testing something)
   - Commit: `test: add failing test for {feature} (BE-{number})`

2. **GREEN - Implement Minimum Code**:
   - Write the simplest code that makes the test pass
   - Run the test again: `pytest path/to/test_file.py::test_name -xvs`
   - Verify it PASSES
   - Commit: `feat: implement {feature} (BE-{number})`

3. **REFACTOR - Improve Quality**:
   - Clean up the code (remove duplication, improve names, etc.)
   - Run test to ensure it still passes
   - If changes made, commit: `refactor: improve {feature} implementation (BE-{number})`

4. **Repeat** for next feature in spec

#### Standard Mode (Implementation-First)

**For each task in the spec**:

1. **Implement**:
   - Write the implementation following the spec
   - Follow existing patterns in the codebase
   - Use proper type hints

2. **Test**:
   - Write comprehensive tests for what you just implemented
   - Include edge cases
   - Run: `pytest path/to/test_file.py -xvs`
   - Verify all pass

3. **Commit**:
   - Use atomic commits per logical unit
   - Format: `{type}({scope}): {description} (BE-{number})`
   - Example: `feat(features/users): add user caching service (BE-101)`

### Step 5: Update Linear Progress

After implementing each issue:

```bash
# Add progress comment
tp comment BE-101 "Implementation complete!

✅ {Summary of what was implemented}
✅ Tests written and passing
✅ {Coverage percentage}%

Next: Running quality gates"

# Mark as done
tp done BE-101
```

### Step 6: Run Quality Gates

After ALL issues are implemented:

```bash
# Call /test to run all quality gates
/test
```

**If gates fail**:
- Review failures
- Fix issues
- Re-run `/test`
- Repeat until all gates pass

**If gates pass**:
- Proceed to reporting

### Step 7: Final Validation

Run the validation commands from the specs:
```bash
npm run verify  # Runs: typecheck, lint, test
```

Ensure:
- All linting passes
- All type checking passes
- All tests pass
- Coverage ≥ 80% (or spec-required threshold)

## Implementation Guidelines

### Follow Atomic Architecture

From `project-config.md`, respect layer boundaries:
- **Atoms**: Can only import other atoms
- **Features**: Can only import atoms
- **Molecules**: Can import features + atoms
- **Organisms**: Can import all layers

### Use Existing Patterns

Before implementing, check for similar code:
- Look in the target layer for examples
- Follow established patterns (don't reinvent)
- Use Field abstraction for models
- Use BaseService for services
- Use FastAPI patterns for organisms/api

### Code Quality Standards

- Use type hints everywhere
- Write docstrings for public APIs
- Keep functions small and focused
- Prefer composition over inheritance
- Use async/await for I/O operations

### Commit Standards

From `project-config.md`:
```
{type}({scope}): {description} (BE-{number})

Examples:
feat(features/users): add user profile caching (BE-101)
test(atoms/cache): add cache adapter tests (BE-101)
fix(features/users): correct cache key generation (BE-105)
```

## Report

After all issues are implemented and gates pass:

### Summary Format

```
Implementation Complete ✅
=========================

Issues Implemented:
✅ BE-101: Create cache abstraction layer
✅ BE-102: Implement Redis cache adapter
✅ BE-103: Add caching to UserService

Implementation Mode:
- BE-101: TDD (test-first)
- BE-102: TDD (test-first)
- BE-103: Standard (implementation-first)

Changes:
- Files created: {number}
- Files modified: {number}
- Total tests: {number} (all passing)
- Coverage: {percentage}%

Git Summary:
```
git diff --stat origin/main
```

Quality Gates:
✅ Format
✅ Lint
✅ Type Check
✅ Architecture Validation
✅ Tests (82% coverage)

Next Steps:
- Review changes: git diff origin/main
- Or proceed with code review: /review
- Or create PR: /pr BE-{epic-number}
```

### Linear Status

All issues should be:
- ✅ Marked as "Done" via `tp done`
- ✅ Commented with implementation summary
- ✅ Ready for review

## Integration

- **Called after**: `/plan` creates specs
- **Calls**: `/test` for quality validation
- **Before**: `/review` or `/pr`

## Example Usage

```bash
# Implement all sub-issues for an epic
/implement BE-101 BE-102 BE-103

# Implement single issue with forced TDD
/implement BE-104 --tdd

# Implement without TDD
/implement BE-105 --no-tdd
```

## Notes

- **Atomic Commits**: Make small, focused commits throughout
- **Test Coverage**: Aim for 90%+ on new code (80% minimum)
- **TDD Default**: Bugs get TDD by default, features ask user
- **Quality Gates**: Auto-runs `/test` at the end
- **Linear Integration**: Updates progress throughout

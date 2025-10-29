# Quality Gate Validation

Execute comprehensive quality gates for Pattern Stack, returning results in a standardized JSON format. This is the foundation for production-ready AI-generated code.

## Purpose

Proactively identify and fix issues before they reach code review or production:
- Detect code quality violations (formatting, linting, type errors)
- Validate architecture boundaries and layer dependencies
- Ensure test coverage and correctness
- Enforce production standards automatically

**Philosophy**: Quality gates prevent bad code; reviews provide guidance.

## Variables

GATE_TIMEOUT: 10 minutes per gate
COVERAGE_THRESHOLD: 80%
TEAM: TASK

## Read
.claude/config/project-config.md

## Arguments

- `--fix`: Attempt auto-fixes where possible (format, safe lint fixes)
- `--gate=<name>`: Run specific gate only (format|lint|typecheck|validate|test)
- `--strict`: Fail fast on first error (stop at first gate failure)
- `--coverage=<N>`: Override coverage threshold (default: 80)

## Instructions

**IMPORTANT**: Read `.claude/config/project-config.md` for current validation commands and thresholds.

### Execution Strategy

1. **Sequential Execution**: Run gates in order (each gate builds on previous)
2. **Capture All Results**: Even if gates fail, capture all for reporting
3. **Auto-Fix When Possible**: Format gate auto-fixes and commits
4. **JSON Output**: Return machine-parseable results
5. **Human Summary**: Also provide readable summary

### Error Handling

- If gate returns non-zero exit code, mark as failed
- Capture stderr for error details
- Timeout commands after GATE_TIMEOUT
- **IMPORTANT**: If `--strict` flag, stop at first failure
- Otherwise, continue through all gates for complete report

### Gate Execution Order

**Phase 1: Code Quality** (Can auto-fix)
1. Format
2. Lint
3. Type Check

**Phase 2: Testing** (Cannot auto-fix)
4. Test Suite

## Quality Gates

### Gate 1: Format

**Purpose**: Enforce consistent code formatting
**Command**: `npm run format`
**Tool**: `prettier --write "src/**/*.{ts,tsx,js,jsx,json,md}"`
**Auto-Fix**: YES
**Can Commit**: YES

**Process**:
1. Run `git diff --name-only` to capture current state
2. Run `npm run format`
3. Run `git diff --name-only` again
4. If files changed:
   - Run `git add -A`
   - Run `git commit -m "style: auto-format code"`
   - Mark as "passed" with "auto_fixed: true"
5. If no changes:
   - Mark as "passed" with "auto_fixed: false"

### Gate 2: Lint

**Purpose**: Detect code quality issues, unused imports, complexity violations
**Command**: `npm run lint`
**Tool**: `eslint src --ext .ts`
**Auto-Fix**: PARTIAL (safe fixes only with `--fix` flag)
**Can Commit**: NO (report issues for manual review)

**Process**:
1. Run `npm run lint`
2. If exit code 0: passed
3. If exit code > 0: failed
   - Capture stdout/stderr
   - Parse for specific violations:
     - File path
     - Line number
     - Rule code
     - Message
   - Count total errors
   - If `--fix` flag provided, suggest: "Run `npm run lint:fix` to auto-fix safe issues"

### Gate 3: Type Check

**Purpose**: Enforce strict type safety
**Command**: `npm run typecheck`
**Tool**: `tsc --noEmit`
**Auto-Fix**: NO
**Can Commit**: NO

**Process**:
1. Run `npm run typecheck`
2. If exit code 0: passed
3. If exit code > 0: failed
   - Capture stdout/stderr
   - Parse for type errors:
     - File path
     - Line number
     - Error message
   - Count total errors

### Gate 4: Test Suite

**Purpose**: Validate functionality and enforce coverage threshold
**Command**: `npm run test:ci`
**Tool**: jest with coverage
**Auto-Fix**: NO
**Can Commit**: NO
**Coverage Required**: 80% (or override with `--coverage`)

**Process**:
1. Run `npm run test:ci`
2. Capture execution time
3. If exit code 0: passed
   - Extract coverage percentage from output
   - If coverage < COVERAGE_THRESHOLD: FAIL with coverage message
   - Otherwise: PASS
4. If exit code > 0: failed
   - Parse test failures:
     - Test name
     - File path
     - Failure reason
     - Stack trace (truncated)
   - Count: total tests, passed, failed
   - Extract coverage if available

## Output Format

### JSON Structure

```json
{
  "success": boolean,
  "timestamp": "ISO8601",
  "gates": [
    {
      "name": "format|lint|typecheck|validate|test",
      "passed": boolean,
      "duration_seconds": number,
      "execution_command": "string - exact command run",
      "auto_fixed": boolean (only for format gate),
      "critical": boolean (only for validate gate),
      "error_count": number (if failed),
      "errors": [
        {
          "file": "path/to/file.py",
          "line": number,
          "code": "string (lint only)",
          "message": "string"
        }
      ],
      "coverage_percent": number (test gate only),
      "coverage_threshold": number (test gate only)
    }
  ],
  "total_duration_seconds": number,
  "failed_gates": number,
  "summary": "string - human readable summary"
}
```

### Example Output

```json
{
  "success": false,
  "timestamp": "2025-10-26T23:30:00Z",
  "gates": [
    {
      "name": "format",
      "passed": true,
      "duration_seconds": 2.3,
      "execution_command": "make format",
      "auto_fixed": true
    },
    {
      "name": "lint",
      "passed": false,
      "duration_seconds": 1.8,
      "execution_command": "make lint",
      "error_count": 3,
      "errors": [
        {
          "file": "pattern_stack/atoms/cache/redis.py",
          "line": 45,
          "code": "F841",
          "message": "Local variable 'key' is assigned but never used"
        }
      ]
    },
    {
      "name": "typecheck",
      "passed": false,
      "duration_seconds": 3.2,
      "execution_command": "make typecheck",
      "error_count": 1,
      "errors": [
        {
          "file": "pattern_stack/features/users/service.py",
          "line": 67,
          "message": "Argument 1 has incompatible type \"str\"; expected \"UUID\""
        }
      ]
    },
    {
      "name": "validate",
      "passed": true,
      "duration_seconds": 1.5,
      "execution_command": "make validate",
      "critical": true
    },
    {
      "name": "test",
      "passed": true,
      "duration_seconds": 45.2,
      "execution_command": "make test-ci",
      "coverage_percent": 82.5,
      "coverage_threshold": 80
    }
  ],
  "total_duration_seconds": 54.0,
  "failed_gates": 2,
  "summary": "2 of 5 gates failed: lint (3 issues), typecheck (1 issue). Format auto-fixed and committed. Architecture validation and tests passed."
}
```

## Execution Flow

1. **Initialize**: Capture start time, check for flags
2. **Read Config**: Load validation commands from `.claude/config/project-config.md`
3. **Execute Gates**:
   - For each gate in order:
     a. Announce: "Running {gate}..."
     b. Execute command with timeout
     c. Capture result, duration, errors
     d. If `--strict` and failed: stop, return results
     e. If format gate and auto-fixed: commit changes
4. **Aggregate Results**: Build JSON object
5. **Generate Summary**: Human-readable summary
6. **Return**: JSON object + human summary

## Fix Loop Pattern

**IMPORTANT**: This command is designed to be called in a loop until success:

```
while ! /test; do
  # Parse JSON errors
  # Fix errors (manual or automated)
  # Re-run /test
done
```

**For demo**: Plant intentional bugs, show gates catching them, fix, re-run.

## Report

- IMPORTANT: Return JSON object as specified above
- Also print human-readable summary to help developers
- Exit code: 0 if all gates passed, 1 if any failed

### Human Summary Format

```
Quality Gates Report
====================

✅ Format: PASSED (auto-fixed and committed)
❌ Lint: FAILED (3 issues)
   - F841: Unused variable in pattern_stack/atoms/cache/redis.py:45
   - E501: Line too long in pattern_stack/features/users/models.py:12
   - ...
❌ Type Check: FAILED (1 issue)
   - Incompatible type in pattern_stack/features/users/service.py:67
✅ Architecture Validation: PASSED
✅ Tests: PASSED (82.5% coverage, threshold: 80%)

Summary: 2 of 5 gates failed
Duration: 54.0 seconds

Next Steps:
1. Fix lint issues: ruff check --fix (for safe fixes)
2. Fix type error in pattern_stack/features/users/service.py:67
3. Re-run: /test
```

## Demo Strategy

**For tomorrow's demo**:

1. **Plant intentional bugs**:
   - Unused import in a file
   - Type annotation error
   - Missing test for a function (drop coverage below 80%)

2. **Run /test**: Show each gate executing

3. **Show output**:
   - JSON for automation
   - Human summary for understanding
   - Specific actionable errors

4. **Fix bugs**: Show fixing each issue

5. **Re-run /test**: Show all gates passing

6. **Emphasize**: "This is how AI code can be production-ready - automated quality gates catch issues before human review"

## Integration

- Called automatically by `/implement` after code changes
- Can be called standalone anytime
- Results inform `/review` (skip code quality review if gates pass)
- Blocks `/pr` until all gates pass (--no-test to override)

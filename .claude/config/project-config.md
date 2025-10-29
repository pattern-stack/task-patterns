# Task Patterns Project Configuration

**Purpose**: Centralized configuration for Task Patterns (tp) CLI commands and workflows.
**Usage**: All atomic commands and orchestrators should reference this file for project-specific paths, validation, and architecture rules.

## Project Overview

**Name**: Task Patterns (tp)
**Type**: TypeScript CLI / Linear API Client
**Architecture**: Pragmatic Atomic Architecture
**Tech Stack**: TypeScript, Node.js, Linear SDK (@linear/sdk), Commander
**Package Manager**: npm
**Testing**: Jest, ts-jest

## File Structure

### Layer Paths
```
src/
├── atoms/              # Foundation utilities (domain-agnostic)
│   ├── config/         # Hierarchical configuration system
│   ├── client/         # Linear API client
│   ├── logger/         # Logging utilities
│   └── types/          # Shared TypeScript types
├── features/           # Linear SDK wrappers (model-specific)
│   ├── issues/         # Issue operations
│   ├── teams/          # Team operations
│   ├── projects/       # Project operations
│   ├── users/          # User operations
│   └── labels/         # Label operations
├── molecules/          # Domain workflows & entities
│   ├── entities/       # Domain objects (compose features)
│   ├── workflows/      # Multi-step operations
│   └── validators/     # Business validation
└── organisms/          # User interfaces
    └── cli/            # Commander CLI (tp commands)
```

### Test Paths
```
src/__tests__/
├── atoms/              # Atom layer tests
├── features/           # Feature layer tests
├── molecules/          # Molecule layer tests
└── organisms/          # Organism layer tests (integration)
```

### Spec Paths
```
specs/
├── issue-TASK-{number}-{description}.md    # Feature/bug/chore specs
└── patch/
    └── patch-{id}-{description}.md         # Quick fix specs
```

### Session Logs
```
agent-logs/
└── {session-id}/                           # Self-contained session directory
    ├── session.json                        # Session metadata
    ├── 00-request.md                       # Original request
    ├── XX-{phase-name}.md                  # Phase logs
    └── summary.md                          # Final summary
```

### Configuration Paths
```
.tp/config.json                             # Local project config
~/.task-pattern/config.json                 # Global user config
.env                                        # Environment variables
```

## Validation Commands

### Code Quality Gates (Sequential Execution)

**1. Format** (Auto-fix)
```bash
npm run format
# Runs: prettier --write "src/**/*.{ts,tsx,js,jsx,json,md}"
# Auto-commits if changes made
```

**2. Lint** (Report issues)
```bash
npm run lint
# Runs: eslint src --ext .ts
# Auto-fix with: npm run lint:fix
```

**3. Type Check** (Strict mode)
```bash
npm run typecheck
# Runs: tsc --noEmit
# Requires: All types correct
```

**4. Test Suite** (Coverage required)
```bash
npm run test:ci
# Runs: jest --ci --coverage --maxWorkers=2
# Requires: 80% minimum coverage
```

### Combined Quality Check
```bash
npm run verify
# Runs: typecheck + lint + test
# Must pass before PR creation
```

### Development Helpers
```bash
npm run dev              # Watch mode with auto-rebuild
npm run test:watch       # Auto-rerun tests on file changes
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:coverage    # With coverage report
```

## Architecture Rules (Pragmatic Atomic Architecture)

### Layer Dependencies (Unidirectional Flow)
```
Organisms ────→ Molecules ────→ Features ────→ Atoms
   (CLI)        (Workflows)     (SDK Wrappers) (Utilities)
```

**Rules**:
- ✅ Organisms CAN import from: Molecules, Features, Atoms
- ✅ Molecules CAN import from: Features, Atoms
- ✅ Features CAN import from: Atoms ONLY
- ✅ Atoms CAN import from: Other atoms ONLY
- ❌ NEVER import backwards (e.g., Atoms importing Features)
- ❌ NEVER cross-import within same layer (e.g., Feature A importing Feature B)

### Layer Responsibilities

**Atoms** - Foundation building blocks:
- Domain-agnostic utilities
- Configuration management (hierarchical config system)
- Linear API client setup
- Logging infrastructure
- Shared TypeScript types

**Features** - Linear SDK wrappers:
- ONE Linear model per feature
- Thin wrappers around @linear/sdk operations
- NO business logic
- NO cross-feature dependencies
- Direct SDK calls only

**Molecules** - Domain workflows:
- Compose multiple feature services
- Business logic and orchestration
- Multi-step workflows (e.g., create issue + link + label)
- Domain validation

**Organisms** - User interfaces:
- Commander CLI commands
- NO business logic (delegate to Molecules)
- User interaction and formatting
- Command parsing and validation

### Import Examples

**✅ CORRECT**:
```typescript
// In features/issues/service.ts
import { LinearClient } from '@/atoms/client'  // Atom
import { logger } from '@/atoms/logger'        // Atom

// In molecules/workflows/issue-creation.ts
import { IssueService } from '@/features/issues'    // Feature
import { LabelService } from '@/features/labels'    // Feature
import { logger } from '@/atoms/logger'             // Atom

// In organisms/cli/commands/add.ts
import { IssueCreationWorkflow } from '@/molecules/workflows'  // Molecule
import { IssueService } from '@/features/issues'               // Feature
```

**❌ INCORRECT**:
```typescript
// In features/issues/service.ts
import { LabelService } from '@/features/labels'  // ❌ Feature → Feature

// In atoms/logger/index.ts
import { IssueService } from '@/features/issues'  // ❌ Atom → Feature

// In molecules/workflows/issue.ts
import { ProjectWorkflow } from '@/molecules/workflows'  // ❌ Molecule → Molecule
```

## Testing Strategy

### Test Requirements

**Coverage**:
- Minimum: 80% overall coverage
- New code: 80%+ coverage required
- Critical paths: 90%+ coverage + edge cases

**Test Types**:
1. **Unit Tests**: Isolated component testing, mocked dependencies
2. **Integration Tests**: Cross-layer interactions, real Linear API calls (mocked in CI)

**TDD Requirements**:
- **Bugs**: TDD required (write failing test first)
- **Features**: TDD recommended
- **Refactoring**: Maintain existing test coverage

### Test Fixtures

Create test utilities in `src/__tests__/helpers/`:
```typescript
// Mock Linear SDK responses
// Create test fixtures for issues, teams, etc.
// Shared test utilities
```

## Guidance Documents

### Primary References
- `CLAUDE.md` - Main project guidance for AI assistants
- `.claude/commands/README.md` - Command system overview
- `.claude/commands/shared/session-logging.md` - Session logging framework

### Command Documentation
- `.claude/commands/plan/` - Requirements decomposition workflow
- `.claude/commands/implement.md` - TDD implementation workflow
- `.claude/commands/test.md` - Quality gate validation

## Commit Standards

### Format
```
<type>(<scope>): <description> (TASK-XXX)

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring
- `test`: Test additions/changes
- `docs`: Documentation updates
- `chore`: Maintenance tasks

### Scopes
Use layer-specific scopes:
- `atoms/<component>`: e.g., `atoms/config`, `atoms/client`
- `features/<feature>`: e.g., `features/issues`, `features/labels`
- `molecules/<component>`: e.g., `molecules/workflows`, `molecules/entities`
- `organisms/cli`: e.g., `organisms/cli`

### Examples
```
feat(features/issues): add issue creation with labels (TASK-101)
fix(atoms/config): correct hierarchical config loading (TASK-102)
test(molecules/workflows): add comprehensive workflow tests (TASK-103)
docs: update README with new commands (TASK-104)
```

## Development Workflow

### Standard Flow
1. Create Linear issue with proper labels (`type:feature`, `layer:*`)
2. Create feature branch: `feature/TASK-XXX-description`
3. Generate spec in `specs/issue-TASK-XXX-*.md`
4. Implement following spec (TDD if applicable)
5. Run quality gates: `npm run verify`
6. Create PR with spec links
7. Merge when approved + CI passes

### TDD Flow (for bugs)
1. Create failing test reproducing bug
2. Run `npm test` - verify failure
3. Implement minimal fix
4. Run `npm test` - verify pass
5. Refactor for quality
6. Run `npm run verify` - full validation

## Tool Configuration

### Package Management
```bash
npm install                    # Install dependencies
npm install <package>          # Add runtime dependency
npm install --save-dev <package>  # Add dev dependency
```

### Build
```bash
npm run build                  # Compile TypeScript to dist/
npm run dev                    # Watch mode with auto-rebuild
```

### CLI Development
```bash
npm run cli -- <command>       # Test CLI commands
tsx src/organisms/cli/index.ts # Direct execution
```

## Common Patterns

### Adding a New tp Command
```
1. Command in organisms/cli/index.ts (Commander)
2. Service in features/ if needed (Linear SDK wrapper)
3. Workflow in molecules/ for complex logic
4. Tests in src/__tests__/ (write tests first if TDD)
5. Validation: npm run verify
```

### Adding a New Feature Service
```
1. Service in features/{name}/service.ts (wraps Linear SDK)
2. Types in features/{name}/types.ts
3. Tests in src/__tests__/features/{name}/
4. Validation: npm run verify
```

### Adding a New Workflow
```
1. Workflow in molecules/workflows/{name}.ts (composes features)
2. Tests in src/__tests__/molecules/workflows/
3. Used by organisms/cli commands
4. Validation: npm run verify
```

## Project-Specific Notes

### Configuration System
The project uses a **hierarchical configuration system**:
1. Local project config (`.tp/config.json`) - highest priority
2. Global user config (`~/.task-pattern/config.json`)
3. Environment variables (`.env`)
4. Hardcoded defaults

### Working Directory Awareness
The CLI preserves the original working directory via `TP_ORIGINAL_CWD` environment variable, allowing true per-project configurations.

### Linear Integration
- Uses `@linear/sdk` for all Linear API calls
- Features wrap SDK methods with error handling and logging
- Molecules compose multiple feature calls into workflows
- Organisms expose workflows as CLI commands

### TypeScript Usage
- **Strict mode** enabled
- All functions must have type annotations
- No implicit `any` types
- Prefer interfaces over types for extensibility

## External References

### Linear Integration

**Team**: TASK (task-patterns)

**Labels**: `type:*`, `layer:*`, `domain:*`, `tdd:required`

**Workflow States**: Backlog → Refinement → Ready → In Progress → In Review → Done

**Label Management** (via tp CLI):
```bash
# Discover available labels
tp labels list --team TASK
tp update TASK-XXX --list-labels

# Add labels (appends to existing)
tp update TASK-XXX --add-labels "type:feature,layer:atoms"

# Replace all labels
tp update TASK-XXX --set-labels "type:feature,layer:atoms"

# Remove labels
tp update TASK-XXX --remove-labels "mvp"
```

**Status Updates**:
```bash
tp update TASK-XXX --status "Refinement"
tp update TASK-XXX --status "Ready"
tp update TASK-XXX --status "In Progress"
```

### GitHub
- Branch protection: main (requires PR + CI)
- CI: GitHub Actions (runs `npm run verify`)
- PR template: Links to specs + Linear issues

---

**Last Updated**: 2025-10-29
**Maintained By**: Task Patterns Team
**For Questions**: See CLAUDE.md or .claude/commands/

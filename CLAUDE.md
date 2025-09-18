# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Task Patterns (tp) - An AI-human collaborative task management system built on Linear's API. A TypeScript-based Linear GraphQL API agent implementing atomic architecture for clean separation of concerns and scalable code organization.

## Essential Commands

### Quick Reference
```bash
# Development cycle
npm run build          # Compile TypeScript (ALWAYS after changes)
npm run dev           # Watch mode with auto-rebuild
npm test              # Run all tests
npm run verify        # Full check (typecheck + lint + test)

# Using tp during development
tp context            # See current work
tp add "implement X"  # Create task
tp working TASK-19    # Start working
tp done TASK-19       # Mark complete

# Configuration
tp config init        # Create .tp/config.json for project
tp config teams TASK  # Set team filter (interactive prompt)
tp config show        # View merged configuration
```

## Configuration System

### Hierarchical Configuration
The system uses three configuration layers (highest to lowest priority):
1. **Local Project** (`.tp/config.json`) - Project-specific settings
2. **Global User** (`~/.task-pattern/config.json`) - User preferences
3. **Environment Variables** - System defaults

### Working Directory Awareness
The CLI correctly detects the working directory through `TP_ORIGINAL_CWD` environment variable, allowing true per-project configurations.

### Interactive Prompts
When using `tp config set` or `tp config teams` without flags, the CLI will:
- Ask whether to save locally or globally
- Offer to create local config if missing
- Default to local when available

### Configuration Files

#### Local Project (`.tp/config.json`)
```json
{
  "teamFilter": ["TASK", "TECH"],
  "defaultTeam": "TASK",
  "workspaceId": "optional_workspace_id"
}
```

#### Global User (`~/.task-pattern/config.json`)
```json
{
  "defaultTeam": "TASK",
  "activeTeams": ["TASK", "TECH"],
  "backend": "linear",
  "linearApiKey": "lin_api_xxx"
}
```

## Architecture

The codebase follows **Pragmatic Atomic Architecture** that works WITH the Linear SDK:

```
src/
├── atoms/       # Foundation layer - no dependencies
├── features/    # Data services - imports only from atoms
├── molecules/   # Domain logic - imports from atoms & features
└── organisms/   # User interfaces - imports from all layers
```

### Layer Rules
1. **Atoms**: Foundation utilities (client, config, logger, types). Cannot import from other layers.
2. **Features**: Services that wrap SDK operations. Can handle SDK-natural relationships.
3. **Molecules**: Entities & workflows for complex business logic.
4. **Organisms**: CLI commands and API endpoints.

### Key Components
- **Config System**: `src/atoms/config/` - Hierarchical configuration
- **CLI Entry**: `src/organisms/cli/index.ts` - Commander-based CLI
- **Project Discovery**: `src/atoms/config/project-discovery.ts` - Finds .tp/config.json
- **Working Directory**: `bin/tp.js` - Preserves original CWD

## Test-Driven Development (TDD)

**IMPORTANT**: All new features must follow TDD. See `.claude/tickets/TDD-GUIDELINES.md` for detailed workflow.

1. **Write tests FIRST** - Create failing tests before implementation
2. **Red-Green-Refactor** - Tests fail → Write code to pass → Refactor
3. **Minimum 80% coverage** - Required for all new code

### Testing Commands
```bash
npm test                         # Run all tests
npm run test:unit               # Unit tests only
npm run test:integration        # Integration tests only
npm run test:coverage           # With coverage report
npm run test:watch              # Watch mode for TDD
npm test -- path/to/test.ts    # Single test file
```

## Working with Tasks

**IMPORTANT**: Use the `tp` command throughout development to track progress:

1. **Start of session**: Run `tp context` to see current work
2. **During development**:
   - `tp add "implement X"` when starting new work
   - `tp working TASK-ID` when beginning a task
   - `tp done TASK-ID` when completing
3. **View details**: `tp show TASK-ID` for full task information
4. **Update status**: `tp update TASK-ID --status "In Review"`

## Git Workflow

When committing changes:
1. Create issues with `tp add "description"`
2. Reference issue in commits: `git commit -m "feat: add feature [TASK-19]"`
3. Use conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`

## Environment Setup

Create `.env` from `.env.sample`:
```bash
LINEAR_API_KEY=your_api_key_here  # Required
LINEAR_WORKSPACE_ID=optional_id    # Optional
LOG_LEVEL=info                     # debug, info, warn, error
NODE_ENV=development               # development, production, test
```

## Common Patterns

### Adding a New Command
1. Add command in `src/organisms/cli/index.ts`
2. Create service if needed in `src/features/`
3. Add entity/workflow in `src/molecules/` for complex logic
4. Write tests first (TDD)

### Debugging
```bash
LOG_LEVEL=debug tp context     # Verbose logging
npm run dev                    # Auto-rebuild on changes
tp config show                 # Check configuration sources
```

### Configuration Priority
1. Command line flags (highest)
2. Local project config (`.tp/config.json`)
3. Global user config (`~/.task-pattern/config.json`)
4. Environment variables
5. Hardcoded defaults (lowest)

## Key Design Principles

1. **Single Responsibility**: Each service handles one Linear model
2. **Composition over Inheritance**: Entities compose services
3. **Validation at Boundaries**: Entities validate before delegating
4. **Thin Interfaces**: Organisms are lightweight wrappers
5. **Error Handling**: Custom errors with consistent messaging
6. **Async-First**: All data operations are async

## Development Tickets

Active development is tracked in Linear (team: TASK). Use `tp context` to see current work.

Historical tickets in `.claude/tickets/`:
- **mvp1-core/**: Core Linear operations (8 tickets)
- **mvp2-collaboration/**: Team features (4 tickets)
- **technical-debt/**: Infrastructure (3 tickets)

Reference tickets by ID (e.g., TASK-19) when implementing features.
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Linear Agent - A TypeScript-based Linear GraphQL API agent implementing atomic architecture for clean separation of concerns and scalable code organization.

## Development Commands

### Essential Commands
```bash
# Install dependencies
npm install

# Development with hot reload
npm run dev

# Run CLI commands
npm run cli [command]

# Build TypeScript
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Full verification (typecheck + lint + test)
npm run verify
```

### Test-Driven Development (TDD)
**IMPORTANT**: All new features must follow TDD. See `.claude/tickets/TDD-GUIDELINES.md` for detailed workflow.

1. **Write tests FIRST** - Create failing tests before any implementation
2. **Red-Green-Refactor** - Tests fail → Write code to pass → Refactor
3. **Minimum 80% coverage** - Required for all new code

### Testing Commands
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit        # Unit tests only (atoms, features, molecules)
npm run test:integration # Integration tests only (organisms)

# Test with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# CI optimized testing
npm run test:ci

# Run single test file
npm test -- src/__tests__/features/issue.service.test.ts
```

## Architecture

The codebase follows **Atomic Architecture** with strict layer dependencies:

```
src/
├── atoms/       # Foundation layer - no dependencies
├── features/    # Data services - imports only from atoms
├── molecules/   # Domain logic - imports from atoms & features
└── organisms/   # User interfaces - imports from all layers
```

### Layer Rules
1. **Atoms**: Foundation utilities (client, config, logger, types). Cannot import from other layers.
2. **Features**: Single-model services (IssueService, TeamService, etc.). Only imports from atoms.
3. **Molecules**: Entities & workflows that compose multiple services. Imports from atoms and features.
4. **Organisms**: CLI commands and API endpoints. Can import from all layers.

### Key Components

**Core Singleton**: `LinearClientManager` (atoms/client/linear-client.ts) - Manages Linear SDK connection

**Primary Entity**: `IssueEntity` (molecules/entities/issue.entity.ts) - Orchestrates issue operations with validation and relations

**Main Workflow**: `SprintPlanningWorkflow` (molecules/workflows/sprint-planning.workflow.ts) - Handles complex sprint planning operations

**CLI Entry**: `organisms/cli/index.ts` - Commander-based CLI interface

## Environment Setup

Create `.env` from `.env.sample`:
```bash
LINEAR_API_KEY=your_api_key_here  # Required
LINEAR_WORKSPACE_ID=optional_id    # Optional
LOG_LEVEL=info                     # debug, info, warn, error
NODE_ENV=development               # development, production, test
```

## Testing Approach

Tests mirror the atomic architecture:
- **atoms/__tests__**: Unit tests for foundation utilities
- **features/__tests__**: Service layer unit tests with mocked Linear SDK
- **molecules/__tests__**: Entity and workflow orchestration tests
- **organisms/__tests__**: Integration tests for CLI commands

Test utilities available:
- `createMockLinearClient()` - Mock Linear SDK client
- `TestFactory` - Generate consistent test data
- `TestHelpers` - Flush promises, mock console, performance testing

## TypeScript Configuration

- Target: ES2022
- Strict mode enabled
- Path aliases configured: `@atoms/*`, `@features/*`, `@molecules/*`, `@organisms/*`
- Source maps and declarations generated
- Test files excluded from build

## Key Design Principles

1. **Single Responsibility**: Each service handles one Linear model
2. **Composition over Inheritance**: Entities compose services, not extend them
3. **Validation at Boundaries**: Entities validate before delegating to services
4. **Thin Interfaces**: Organisms are lightweight wrappers around domain logic
5. **Error Handling**: Custom errors (NotFoundError) with consistent messaging
6. **Async-First**: All data operations are async with proper error handling

## Development Tickets

Active development is tracked in `.claude/tickets/` with the following structure:
- **mvp1-core/**: Core Linear operations (8 tickets) - CRUD for all primary objects
- **mvp2-collaboration/**: Team features (4 tickets) - Webhooks, search, notifications, reporting  
- **technical-debt/**: Infrastructure (3 tickets) - Error handling, caching, integration tests

Each ticket follows Linear's format with status, priority, estimates, and acceptance criteria. 
Reference tickets by ID (e.g., LIN-001) when implementing features.
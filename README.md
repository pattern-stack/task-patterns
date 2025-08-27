# Linear Agent - Atomic Architecture

A TypeScript-based Linear GraphQL API agent built with atomic architecture principles.

## Architecture Overview

```
src/
├── atoms/          # Foundation layer - utilities, client, types
├── features/       # Data services - one per Linear model
├── molecules/      # Domain entities & workflows
└── organisms/      # User interfaces - CLI, API
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.sample .env
# Edit .env with your Linear API key
```

3. Build the project:
```bash
npm run build
```

## CLI Usage

The Linear CLI is designed for AI-assisted development workflows. See [CLI_GUIDE.md](./CLI_GUIDE.md) for comprehensive documentation.

### Quick Start
```bash
# Check what we're working on
npm run cli context

# Add a new task
npm run cli add "Implement new feature"

# Start working on an issue
npm run cli working DUG-79

# Mark as complete
npm run cli done DUG-79

# Update issue
npm run dev src/organisms/cli/index.ts issue update ISSUE_ID -p 2 --state STATE_ID

# Add comment
npm run dev src/organisms/cli/index.ts issue comment ISSUE_ID "This is a comment"

# Assign issue
npm run dev src/organisms/cli/index.ts issue assign ISSUE_ID USER_ID
```

### Team Management
```bash
# List teams
npm run dev src/organisms/cli/index.ts team list

# Get team details
npm run dev src/organisms/cli/index.ts team get TEAM_KEY

# List team members
npm run dev src/organisms/cli/index.ts team members TEAM_ID

# List team cycles
npm run dev src/organisms/cli/index.ts team cycles TEAM_ID

# List workflow states
npm run dev src/organisms/cli/index.ts team states TEAM_ID
```

### Project Management
```bash
# Create project
npm run dev src/organisms/cli/index.ts project create -n "New Project" --teams TEAM1,TEAM2

# List projects
npm run dev src/organisms/cli/index.ts project list

# Get project issues
npm run dev src/organisms/cli/index.ts project issues PROJECT_ID

# Get project milestones
npm run dev src/organisms/cli/index.ts project milestones PROJECT_ID
```

## Programmatic Usage

```typescript
import { IssueEntity } from './molecules/entities/issue.entity';
import { SprintPlanningWorkflow } from './molecules/workflows/sprint-planning.workflow';

// Create issue entity
const issueEntity = new IssueEntity();

// Create an issue
const issue = await issueEntity.create({
  title: 'New feature',
  teamId: 'team-id',
  description: 'Feature description',
  priority: 2,
});

// Get issue with relations
const fullIssue = await issueEntity.getWithRelations(issue.id);

// Sprint planning workflow
const workflow = new SprintPlanningWorkflow();
const result = await workflow.planSprint({
  teamId: 'team-id',
  cycleId: 'cycle-id',
  issueIds: ['issue1', 'issue2'],
});
```

## Architecture Principles

### Atoms Layer
- **Purpose**: Foundation utilities
- **Contains**: Linear client, config, logger, common types
- **Import Rule**: Imports nothing from other layers

### Features Layer
- **Purpose**: Data services for single models
- **Contains**: Service classes for Issue, Team, Project, etc.
- **Import Rule**: Only imports from atoms

### Molecules Layer
- **Purpose**: Domain entities and workflows
- **Contains**: Composed entities, multi-service workflows
- **Import Rule**: Imports from atoms and features

### Organisms Layer
- **Purpose**: User interfaces
- **Contains**: CLI commands, API endpoints
- **Import Rule**: Imports from all layers

## Key Design Decisions

1. **Services Stay Focused**: Each service handles one Linear model
2. **Entities Compose**: Domain entities combine multiple services
3. **Workflows Orchestrate**: Complex operations span multiple entities
4. **Thin Interfaces**: Organisms are just wrappers around molecules

## Scripts

- `npm run build` - Build TypeScript
- `npm run dev` - Run with tsx watch
- `npm run lint` - Run ESLint
- `npm run typecheck` - Type checking
- `npm test` - Run tests

## Environment Variables

- `LINEAR_API_KEY` - Your Linear API key (required)
- `LINEAR_WORKSPACE_ID` - Workspace ID (optional)
- `LOG_LEVEL` - Logging level: debug, info, warn, error
- `NODE_ENV` - Environment: development, production, test
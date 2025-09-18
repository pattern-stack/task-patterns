# AI Context Guide for task-patterns

## Quick Start for AI Assistants

When working with task-patterns, you are collaborating on an AI-first task management system. This document provides everything you need to know to work effectively with this codebase.

## What is task-patterns?

task-patterns is a CLI tool (`tp`) designed for AI-human collaborative development. It's part of the pattern-stack ecosystem and provides a unified interface to multiple task management backends (currently Linear, with GitHub Issues and Jira planned).

## Key Commands You'll Use

```bash
# Check current work context
tp context  # Shows in-progress, todo, and recently completed tasks

# Add tasks during conversations
tp add "Implement OAuth authentication"  # Creates task in Linear

# Update task status
tp working DUG-79  # Move to In Progress
tp done DUG-79     # Mark complete (with celebration!)

# View details
tp show DUG-79     # Shows full issue details
```

## System Architecture

```
src/
├── atoms/          # Foundation layer - no dependencies
│   ├── client/     # Linear SDK client wrapper
│   ├── contracts/  # Type definitions
│   └── validators/ # Data validation
│
├── features/       # Service layer - wraps Linear SDK operations
│   ├── issue/      # Issue CRUD operations
│   ├── team/       # Team operations
│   └── [model]/    # One folder per Linear model
│
├── molecules/      # Domain layer - business logic
│   ├── entities/   # Domain aggregates (e.g., IssueEntity)
│   ├── workflows/  # Multi-step operations (e.g., BulkOperationsWorkflow)
│   └── *.api.ts    # API facades - THE MAIN INTERFACE
│
└── organisms/      # Interface layer
    └── cli/        # Command-line interface
        ├── index.ts     # Main CLI entry (tp command)
        └── settings.ts  # Configuration management
```

### Key Design Principles

1. **API Facades are the interface**: Always use `IssueAPI`, `TeamAPI`, etc. from molecules layer
2. **Pragmatic architecture**: Services can handle SDK-natural operations, workflows handle complex logic
3. **AI-first CLI**: Positive reinforcement, context awareness, minimal friction
4. **Backend agnostic**: Linear is just the first backend plugin

## Configuration

### Environment Variables (.env)
```bash
LINEAR_API_KEY=lin_api_xxx              # Required: Your Linear API key
LINEAR_DEFAULT_TEAM=TP                  # Optional: Default team key
LINEAR_ACTIVE_TEAMS=TP,BE,FRO          # Optional: Team filter
```

### Local Settings (~/.task-pattern/config.json)
```json
{
  "defaultTeam": "TP",
  "activeTeams": ["TP", "BE", "FRO", "INT"],
  "backend": "linear"
}
```

### Priority Order
1. Command flags (`-t TEAM`)
2. Local config file
3. Environment variables
4. Hardcoded defaults

## Team Structure

Current teams in Linear:
- **TP** - task-patterns (should be created)
- **PTS** - pattern-stack (meta)
- **BE** - backend-patterns
- **FRO** - frontend-patterns
- **INT** - bi-patterns
- **DUG** - DugsApps (personal)

## Label Hierarchy

Labels use a two-level system (`group:label`) for cross-tool compatibility:

- **type:** `feature`, `bug`, `refactor`, `docs`, `test`
- **area:** `tasks`, `teams`, `labels`, `projects`, `auth`, `sync`, `reporting`
- **stage:** `design`, `implement`, `review`, `ready`
- **layer:** `atoms`, `molecules`, `organisms`, `features`
- **backend:** `linear`, `github`, `jira`, `agnostic`

## Current State & Next Steps

### Completed ✅
- CLI with core commands (context, add, show, working, done)
- Team filtering with persistent settings
- IssueAPI facade with entity and workflows
- Global installation as `tp` command
- GitHub repository at pattern-stack/task-patterns

### In Progress 🔄
- Building molecules layer (TeamAPI, LabelAPI, ProjectAPI)
- Team setup functionality
- Bulk label creation

### Planned 📋
- GitHub integration
- MCP server
- Multiple backend support
- Sprint planning features

## Development Workflow

### Starting a Session
```bash
# 1. Check current context
tp context

# 2. Review the roadmap
cat TASK_PATTERNS_ROADMAP.md

# 3. Pick up where we left off or start new task
tp working TASK-ID
```

### During Development
```bash
# Add tasks as they come up
tp add "Refactor TeamAPI to support bulk operations"

# Update status as you work
tp working TASK-123
tp done TASK-123

# Filter to relevant teams
tp config teams TP BE  # Focus on task-patterns and backend-patterns
```

### Testing
```bash
npm test                 # Run all tests
npm run typecheck        # Check TypeScript
npm run lint            # Run linter
npm run verify          # Full verification
```

### Committing Changes
```bash
# AI assistants should create detailed commit messages
git add -A
git commit -m "feat: Add team setup wizard to CLI

- Implemented interactive team creation flow
- Added label template system
- Integrated with TeamAPI facade

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Important Context

### This Started as an MCP
- Originally meant to be a Model Context Protocol server for Linear
- Evolved into a full CLI because we needed it to build the MCP
- Now it's a complete task management abstraction layer

### TypeScript Learning
- The human developer doesn't know TypeScript
- We're learning by building
- Keep explanations practical and example-driven

### Dogfooding
- We use `tp` to track development of `tp` itself
- Every feature should make our own workflow better
- If it's not useful for us, it's not useful

### Pattern-Stack Philosophy
- Everything is a pattern
- Composable, reusable, clean abstractions
- This is one piece of a larger ecosystem

## Common Tasks

### Add a New Command
1. Add to `src/organisms/cli/index.ts`
2. Use the API facade from molecules layer
3. Include positive feedback and clear output
4. Update CLI_GUIDE.md

### Add a New API Method
1. Implement in appropriate service (`src/features/[model]/service.ts`)
2. Add to entity if domain logic (`src/molecules/entities/[model].entity.ts`)
3. Add to workflow if multi-step (`src/molecules/workflows/[workflow].workflow.ts`)
4. Expose through API facade (`src/molecules/[model].api.ts`)
5. Use in CLI

### Add a New Backend
1. Create adapter in features layer
2. Implement backend-specific mappings
3. Update API facades to route appropriately
4. Add backend config option

## Debugging Tips

### Connection Issues
```bash
# Test Linear connection
tp hello  # Basic test
tp config list-teams  # Lists all teams if connected
```

### Check Settings
```bash
tp config show  # Shows current configuration
cat ~/.task-pattern/config.json  # View saved settings
```

### View Logs
```bash
# Logs show [INFO] prefixed messages
# Set LOG_LEVEL=debug in .env for more detail
```

## Key Files

- `src/organisms/cli/index.ts` - Main CLI implementation
- `src/molecules/issue.api.ts` - Issue management facade
- `src/organisms/cli/settings.ts` - Configuration management
- `CLI_GUIDE.md` - User documentation
- `TASK_PATTERNS_ROADMAP.md` - Development roadmap
- `LABEL_HIERARCHY.md` - Label system documentation

## Session Startup Checklist

When starting a new session:

1. ✅ Read this AI_CONTEXT.md
2. ✅ Run `tp context` to see current state
3. ✅ Check `git status` for uncommitted changes
4. ✅ Review TASK_PATTERNS_ROADMAP.md for next steps
5. ✅ Use `tp add` to track new tasks as they arise
6. ✅ Commit frequently with detailed messages
7. ✅ Use positive, encouraging language in all outputs

## Remember

- **You are building WITH the human, not FOR them**
- **Every command should feel encouraging and helpful**
- **We're dogfooding - use `tp` commands throughout the session**
- **This is a pattern-stack project - keep it clean and composable**
- **Linear is just the first backend - stay abstracted**

---

*This document should be your primary reference when working with task-patterns. Keep it updated as the system evolves.*
# task-patterns

> AI-first task management patterns for collaborative development (part of pattern-stack)

## What is task-patterns?

Task-patterns is a CLI tool designed specifically for AI-human collaboration in software development. It provides a unified interface to multiple task management backends (starting with Linear) while maintaining a consistent, encouraging, and efficient workflow.

## Key Features

### 🤝 AI-First Design
- Built for seamless AI-human collaboration
- Positive reinforcement and encouraging messages
- Context-aware commands that keep both parties in sync

### 🔌 Backend Agnostic
- Linear support (current)
- GitHub Issues (planned)
- Jira (planned)
- Extensible architecture for any backend

### 🎯 Smart Team Filtering
- Focus on specific teams or projects
- Persistent settings in `~/.task-pattern/config.json`
- Environment variable support

### 📊 Unified Label System
- Consistent two-level hierarchy (`group:label`)
- Works across different backends
- Enables powerful cross-tool workflows

## Installation

```bash
# Clone the repository
git clone https://github.com/pattern-stack/task-patterns.git
cd task-patterns

# Install dependencies
npm install

# Install globally
npm link

# Install tsx if needed
npm install -g tsx
```

## Configuration

Create a `.env` file:
```bash
LINEAR_API_KEY=your_linear_api_key
LINEAR_DEFAULT_TEAM=TP  # Your default team key
```

## Usage

### Core Commands

```bash
# Check what you're working on
tp context  # or tp c

# Add a new task
tp add "Implement authentication"  # or tp a

# Start working on an issue
tp working TASK-123  # or tp w

# Mark as complete (with celebration!)
tp done TASK-123  # or tp d

# View issue details
tp show TASK-123  # or tp s
```

### Team Management

```bash
# List all available teams
tp config list-teams

# Filter to specific teams
tp config teams BE FRO INT

# Add/remove teams from filter
tp config add-team DUG
tp config remove-team BE

# Clear filters (show all)
tp config clear
```

## Architecture

```
src/
├── atoms/       # Foundation layer - utilities, client, types
├── features/    # Service layer - data operations
├── molecules/   # Domain layer - entities, workflows, APIs
│   ├── entities/
│   ├── workflows/
│   └── *.api.ts # API facades (main interface)
└── organisms/   # Interface layer - CLI, MCP (future)
    └── cli/
        ├── index.ts     # Main CLI
        └── settings.ts  # Configuration management
```

## Label Hierarchy

Task-patterns uses a consistent two-level label system (`group:label`):

- **type:** `feature`, `bug`, `refactor`, `docs`, `test`
- **area:** `tasks`, `teams`, `labels`, `projects`, `auth`, `sync`, `reporting`
- **stage:** `design`, `implement`, `review`, `ready`
- **layer:** `atoms`, `molecules`, `organisms`, `features`
- **backend:** `linear`, `github`, `jira`, `agnostic`

See [LABEL_HIERARCHY.md](./LABEL_HIERARCHY.md) for details.

## Philosophy

1. **Shared Context**: Keep AI and human developers in sync
2. **Positive Experience**: Celebrate wins, encourage progress
3. **Minimal Friction**: Short aliases, smart defaults
4. **Pattern-First**: Part of the pattern-stack ecosystem
5. **Tool Agnostic**: Your workflow, any backend

## Roadmap

- [x] Linear backend support
- [x] Team filtering
- [x] Settings management
- [ ] Team setup wizard
- [ ] GitHub integration
- [ ] Bulk label creation
- [ ] MCP server
- [ ] GitHub Issues backend
- [ ] Jira backend
- [ ] Custom backend API

## Pattern-Stack Ecosystem

Task-patterns is part of the pattern-stack family:

- **backend-patterns** - Backend architecture patterns
- **frontend-patterns** - UI/UX patterns
- **bi-patterns** - Business intelligence patterns
- **agent-patterns** - AI agent patterns
- **task-patterns** - Task management patterns (this project)

## Contributing

This is currently a personal project but may open for contributions in the future.

## License

MIT

---

Built with ❤️ for AI-assisted development
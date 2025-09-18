# Task Patterns (tp)

> Lightning-fast task management for AI-human collaborative development

Task Patterns is a CLI tool that brings joy to task management. Built for developers who work with AI assistants, it provides instant task capture, smart context switching, and celebration of progress—all from your terminal.

## ✨ Why Task Patterns?

Working with AI on code? You need a task system that:
- **Captures tasks instantly** - No context switching, no browser tabs
- **Shows what matters** - Your current work, not everything
- **Celebrates progress** - Because shipping code should feel good
- **Works anywhere** - Local configs follow your projects

## 🚀 Quick Start

```bash
# Install globally
npm install -g task-pattern

# Or clone and link
git clone https://github.com/DougsHub/task-patterns.git
cd task-patterns
npm install && npm link

# Configure (one-time)
export LINEAR_API_KEY=lin_api_xxx  # Add to ~/.zshrc or ~/.bashrc
tp config init                     # Initialize local project config
```

## 🎯 Core Commands

```bash
# What am I working on?
tp context              # Shows your current sprint at a glance

# Capture a task (stay in flow)
tp add "Fix auth bug"   # Creates task instantly

# Work on something
tp working TASK-19      # Marks as in progress
tp done TASK-19         # Complete with celebration! 🎉

# Get details when needed
tp show TASK-19         # Full issue details
tp update TASK-19 --status "In Review"
```

## 🏗️ Configuration

Task Patterns uses a hierarchical configuration system:

### Project Config (`.tp/config.json`)
Each project can have its own settings:
```bash
tp config init                    # Create .tp/config.json
tp config teams TASK TECH         # Set team filters for this project
tp config set defaultTeam TASK    # Set default team for new tasks
```

### Global Config (`~/.task-pattern/config.json`)
User preferences that apply everywhere:
```bash
tp config set --global backend linear  # Choose task backend
```

### Environment Variables
```bash
LINEAR_API_KEY=lin_api_xxx       # Required for Linear
LINEAR_WORKSPACE_ID=xxx           # Optional workspace
```

**Priority**: Local project → Global user → Environment variables

## 🎨 Smart Features

### Team Filtering
Focus on what's relevant:
```bash
tp config teams TASK TECH    # Only see TASK and TECH team issues
tp context                   # Now shows filtered view
```

### Interactive Configuration
No more remembering flags:
```bash
tp config set defaultTeam TASK
# Prompts: "Save to project or global config?"
# Choose with arrow keys - easy!
```

### Project-Aware
Your settings follow your code:
```bash
cd ~/projects/auth-service
tp config init && tp config teams AUTH
# This project now only shows AUTH team tasks

cd ~/projects/frontend
tp config init && tp config teams FE
# This project only shows FE team tasks
```

## 📁 Architecture

Built with **Atomic Architecture** for maintainability:

```
src/
├── atoms/       # Foundation (config, client, types)
├── features/    # Service layer (Linear SDK wrapper)
├── molecules/   # Business logic (entities, workflows)
└── organisms/   # User interfaces (CLI commands)
```

**Key Files:**
- `bin/tp.js` - CLI entry point
- `src/organisms/cli/index.ts` - Command definitions
- `src/atoms/config/` - Configuration system
- `.tp/config.json` - Your project settings

## 🔌 Extensibility

### Current Backend
- ✅ **Linear** - Full support with GraphQL API

### Planned Backends
- 🚧 GitHub Issues
- 🚧 Jira
- 🚧 Custom APIs

The architecture supports any backend through consistent interfaces.

## 🧪 Development

```bash
# Setup
npm install
npm run build

# Development
npm run dev             # Watch mode
npm test               # Run tests
npm run verify         # Full check (lint, type, test)

# Testing
npm run test:watch     # TDD mode
npm run test:coverage  # Coverage report
```

### Using tp While Developing
```bash
npm link               # Link globally
tp context            # Use anywhere

# Or run directly
npm run cli context   # Without global install
```

## 📚 Documentation

- [`CLAUDE.md`](./CLAUDE.md) - AI assistant instructions
- [`docs/`](./docs/) - Architecture, testing, and technical documentation
- [`.claude/tickets/`](./.claude/tickets/) - Development tickets

## 🤝 Contributing

We welcome contributions! Please:
1. Use `tp` to track your work
2. Follow TDD practices (see `.claude/tickets/TDD-GUIDELINES.md`)
3. Run `npm run verify` before committing
4. Tag commits with issue numbers (e.g., `[TASK-19]`)

## 📜 License

MIT

---

Built with ❤️ for developers who ship with AI
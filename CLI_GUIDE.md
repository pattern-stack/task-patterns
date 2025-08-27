# Linear CLI Guide for AI-Assisted Development

## Overview

This CLI is designed specifically for AI-human collaboration. It keeps both the developer and AI assistant in sync about project progress, with positive reinforcement and clear context awareness.

## Installation & Setup

### 1. Environment Configuration

Create a `.env` file with:
```bash
LINEAR_API_KEY=your_linear_api_key_here
LINEAR_DEFAULT_TEAM=dug  # Your default team key
```

### 2. Running the CLI

```bash
npm run cli [command]
```

## Core Commands

### 📊 Context Management

#### `context` (alias: `c`)
Shows what we're currently working on - in progress, todo, and recently completed items.

```bash
npm run cli context
npm run cli c  # shortcut
```

**Output:**
- Currently in progress items
- Up next (todo/backlog)
- Recently completed (last 7 days)

### ✨ Issue Creation

#### `add <title>` (alias: `a`)
Quickly captures a new task during conversations.

```bash
npm run cli add "Implement authentication system"
npm run cli a "Fix bug in user profile"  # shortcut

# Override team for this issue
npm run cli add "Frontend task" -t frontend
```

**Options:**
- `-t, --team <key>`: Override default team

### 📋 Issue Management

#### `show <identifier>` (alias: `s`)
Displays full details of an issue.

```bash
npm run cli show DUG-79
npm run cli s DUG-79  # shortcut
```

**Output:**
- Status, Team, Assignee, Priority
- Labels (if any)
- Description
- Available actions

#### `working <identifier>` (alias: `w`)
Marks an issue as "In Progress" with encouraging message.

```bash
npm run cli working DUG-79
npm run cli w DUG-79  # shortcut
```

**Result:** 
- Updates status to "In Progress"
- Shows: "💪 Let's do this! Focus time!"

#### `done <identifier>` (alias: `d`)
Marks an issue as complete with celebration.

```bash
npm run cli done DUG-79
npm run cli d DUG-79  # shortcut
```

**Result:**
- Updates status to "Done"
- Shows: "🎉 Awesome! Great work!"

### 👋 Utility

#### `hello`
Friendly greeting to test the CLI is working.

```bash
npm run cli hello
```

## Team Configuration

### Priority Order (highest to lowest):
1. **Command flag**: `-t team-key` on specific command
2. **Global flag**: `--team team-key` after `cli`
3. **Environment**: `LINEAR_DEFAULT_TEAM` in `.env`
4. **Default**: 'dug'

### Examples:
```bash
# Use default team from .env
npm run cli add "New task"

# Override for one command
npm run cli add "Frontend bug" -t frontend

# Override for entire session
npm run cli --team backend context
npm run cli --team backend add "API endpoint"
```

## Workflow Examples

### Starting a Development Session

```bash
# 1. Check what we're working on
npm run cli context

# 2. Pick an issue and start working
npm run cli working DUG-79

# 3. When complete
npm run cli done DUG-79
```

### During AI Conversations

```bash
# AI captures a task discussed
npm run cli add "Refactor database schema as discussed"

# AI checks context mid-conversation
npm run cli context

# AI marks current task complete
npm run cli done DUG-79
```

## CLI Design Philosophy

1. **Positive Reinforcement**: Celebrates completions, encourages progress
2. **Minimal Friction**: Short aliases, smart defaults
3. **Context Aware**: Always shows what's relevant now
4. **AI-First**: Designed for AI assistants to use during conversations
5. **Human-Friendly**: Clear output, helpful tips

## Troubleshooting

### Connection Issues
- Verify `LINEAR_API_KEY` is set in `.env`
- Check you have access to the workspace

### Team Not Found
- CLI will fall back to first available team
- Check team key matches exactly (case-insensitive)
- Use `LINEAR_DEFAULT_TEAM` in `.env` to set default

## Next Features (Planned)

- [ ] Team setup wizard (`linear setup-team`)
- [ ] GitHub integration (`linear link-github`)
- [ ] Bulk label creation (`linear create-labels`)
- [ ] Sprint planning (`linear sprint`)
- [ ] Issue templates (`linear template`)

## For AI Assistants

When using this CLI:
1. Always check `context` at start of sessions
2. Use `add` to capture tasks during conversations
3. Use `working` when starting implementation
4. Use `done` with celebration when completing
5. Keep descriptions concise but clear
6. Reference issue IDs in commits: "feat: Add auth system [DUG-79]"

Remember: This CLI is our shared brain - use it liberally!
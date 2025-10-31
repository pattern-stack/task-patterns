# Configuration Guide

## Overview

Task Patterns uses a hierarchical configuration system that merges settings from multiple sources. This guide covers configuration options, precedence, and common setup scenarios.

## Configuration Hierarchy

Settings are merged in this order (highest to lowest priority):

1. **Command-line flags** - Explicit `--team`, `--status` flags
2. **Local project config** - `.tp/config.json` in project root
3. **Global user config** - `~/.task-pattern/config.json`
4. **Environment variables** - `.env` file or shell environment
5. **Hardcoded defaults** - Built into application

## Configuration Files

### Local Project Config (`.tp/config.json`)

**Location:** Project root directory (discovered via `.tp/config.json`)

**Purpose:** Team-shared, project-specific settings

**Example:**
```json
{
  "teamFilter": ["BACKEND", "FRONTEND"],
  "defaultTeam": "BACKEND",
  "workspaceId": "workspace_abc123"
}
```

**When to use:**
- Project has specific teams it focuses on
- Want team members to share same settings
- Different projects need different team filters

**Creating:**
```bash
cd /path/to/project
tp config init                      # Creates .tp/config.json
tp config teams MYTEAM              # Interactive team selection
```

**Committing to Version Control:**
```bash
git add .tp/config.json
git commit -m "chore: add tp team configuration"
git push
```

### Global User Config (`~/.task-pattern/config.json`)

**Location:** User's home directory (`~/.task-pattern/config.json`)

**Purpose:** Personal preferences across all projects

**Example:**
```json
{
  "linearApiKey": "lin_api_xxxxxxxxxxxxx",
  "defaultTeam": "MYTEAM",
  "activeTeams": ["TEAM1", "TEAM2", "TEAM3"],
  "backend": "linear"
}
```

**When to use:**
- Store Linear API key
- Set personal default team
- Configure preferences not project-specific
- Settings you don't want to commit to git

**Creating:**
```bash
# Automatically created on first run or:
mkdir -p ~/.task-pattern
echo '{"linearApiKey": "lin_api_xxx"}' > ~/.task-pattern/config.json
```

### Environment Variables (`.env`)

**Location:** Project root `.env` file

**Purpose:** Secrets and environment-specific settings

**Example:**
```bash
# .env
LINEAR_API_KEY=lin_api_xxxxxxxxxxxxx
LINEAR_WORKSPACE_ID=workspace_abc123
LOG_LEVEL=info
NODE_ENV=development
```

**When to use:**
- Store secrets (API keys)
- Environment-specific settings (dev vs prod)
- Override for local development
- Settings that shouldn't be committed

**Important:** Add `.env` to `.gitignore`!

## Configuration Options

### Team Settings

#### `teamFilter`
**Type:** `string[]`
**Description:** Filter issues to specific teams
**Example:** `["BACKEND", "FRONTEND"]`

```bash
# Set via command
tp config teams BACKEND FRONTEND

# Or edit JSON
{
  "teamFilter": ["BACKEND", "FRONTEND"]
}
```

**Effect:** `tp context` only shows issues from these teams

#### `defaultTeam`
**Type:** `string`
**Description:** Default team for creating new issues
**Example:** `"BACKEND"`

```bash
# Set via command
tp config set defaultTeam "BACKEND"

# Or edit JSON
{
  "defaultTeam": "BACKEND"
}
```

**Effect:** `tp add` creates issues in this team by default

#### `activeTeams`
**Type:** `string[]`
**Description:** Teams you frequently work with
**Example:** `["TEAM1", "TEAM2"]`

```json
{
  "activeTeams": ["TEAM1", "TEAM2"]
}
```

**Effect:** Used for team selection prompts

### Authentication Settings

#### `linearApiKey`
**Type:** `string`
**Description:** Linear API authentication key
**Example:** `"lin_api_xxxxxxxxxxxxx"`

**Recommended location:** Global user config or `.env`

```bash
# In ~/.task-pattern/config.json
{
  "linearApiKey": "lin_api_xxxxxxxxxxxxx"
}

# Or in .env
LINEAR_API_KEY=lin_api_xxxxxxxxxxxxx
```

**Getting your API key:**
1. Go to Linear → Settings → API
2. Generate new personal API key
3. Copy and store securely

#### `workspaceId`
**Type:** `string`
**Description:** Linear workspace identifier (optional)
**Example:** `"workspace_abc123"`

```json
{
  "workspaceId": "workspace_abc123"
}
```

**Usually not needed** - automatically detected from API key

### Backend Settings

#### `backend`
**Type:** `string`
**Description:** Task management backend
**Example:** `"linear"`

```json
{
  "backend": "linear"
}
```

**Currently only `"linear"` is supported**

### Logging Settings

#### `LOG_LEVEL`
**Type:** Environment variable
**Values:** `debug`, `info`, `warn`, `error`
**Default:** `info`

```bash
# In .env
LOG_LEVEL=debug

# Or command line
LOG_LEVEL=debug tp context
```

**Effect:**
- `debug` - Verbose logging, API calls, queries
- `info` - Standard operation logs
- `warn` - Warnings only
- `error` - Errors only

## Common Configuration Scenarios

### Scenario 1: Solo Developer on Single Project

**Setup:**
```bash
# Global config with API key
mkdir -p ~/.task-pattern
cat > ~/.task-pattern/config.json << 'EOF'
{
  "linearApiKey": "lin_api_xxxxxxxxxxxxx",
  "defaultTeam": "MYTEAM"
}
EOF

# Project config (optional, for team filter)
cd project
tp config init
tp config teams MYTEAM
```

**Result:**
- API key stored globally
- Default team set
- No local config needed (or minimal)

### Scenario 2: Multiple Projects, Different Teams

**Global config:**
```json
{
  "linearApiKey": "lin_api_xxxxxxxxxxxxx"
}
```

**Project A (`.tp/config.json`):**
```json
{
  "teamFilter": ["BACKEND"],
  "defaultTeam": "BACKEND"
}
```

**Project B (`.tp/config.json`):**
```json
{
  "teamFilter": ["FRONTEND"],
  "defaultTeam": "FRONTEND"
}
```

**Result:**
- Each project has its own team context
- Switch projects → automatic team context switch

### Scenario 3: Cross-Functional Team Member

**Global config:**
```json
{
  "linearApiKey": "lin_api_xxxxxxxxxxxxx",
  "activeTeams": ["BACKEND", "FRONTEND", "DESIGN"]
}
```

**Project config:**
```json
{
  "teamFilter": ["BACKEND", "FRONTEND", "DESIGN"]
}
```

**Usage:**
```bash
# See all teams
tp context

# Focus on one team temporarily
tp config teams BACKEND
tp context                    # Backend only

# Restore full view
tp config teams BACKEND FRONTEND DESIGN
tp context                    # All teams
```

### Scenario 4: Team Standardization

**Goal:** Everyone on team uses same settings

**Setup:**
```bash
# Create project config
cd shared-project
tp config init

# Configure for team
tp config teams OURTEAM
tp config set defaultTeam "OURTEAM"

# Apply label template
tp labels apply-template task-patterns -t OURTEAM

# Commit to git
git add .tp/config.json
git commit -m "chore: standardize tp configuration"
git push
```

**Team members:**
```bash
# Pull repo
git pull

# tp automatically uses project config
tp context                    # Uses OURTEAM filter
tp add "New task"             # Creates in OURTEAM
```

### Scenario 5: Development vs Production

**Use environment variables for environment-specific settings:**

```bash
# .env.development
LINEAR_API_KEY=lin_api_dev_xxxxx
LINEAR_WORKSPACE_ID=workspace_dev
LOG_LEVEL=debug
NODE_ENV=development

# .env.production
LINEAR_API_KEY=lin_api_prod_xxxxx
LINEAR_WORKSPACE_ID=workspace_prod
LOG_LEVEL=info
NODE_ENV=production
```

**Load appropriate environment:**
```bash
# Development
cp .env.development .env
tp context

# Production
cp .env.production .env
tp context
```

## Configuration Management Commands

### Viewing Configuration

```bash
# Show merged configuration from all sources
tp config show

# Output example:
# Configuration (merged):
# - teamFilter: ["BACKEND"]
# - defaultTeam: "BACKEND"
# - backend: "linear"
# Sources: local, global, env
```

### Setting Values

```bash
# Interactive team selection
tp config teams              # Shows menu, saves to local or global

# Set specific value
tp config set defaultTeam "MYTEAM"

# Set team filter directly
tp config set teamFilter '["TEAM1", "TEAM2"]'
```

### Interactive Prompts

When using commands without flags, tp prompts for save location:

```bash
tp config teams MYTEAM

# Prompts:
# Where would you like to save team filters?
#   1) Local project config (.tp/config.json)
#   2) Global user config
# Choose [1-2] (default: 1):
```

**Defaults:**
- If `.tp/config.json` exists → defaults to local
- Otherwise → defaults to global

### Creating Configuration Files

```bash
# Initialize local project config
tp config init

# Creates .tp/config.json with:
{
  "teamFilter": [],
  "defaultTeam": null
}
```

## Working Directory Detection

The `tp` CLI correctly detects your working directory using the `TP_ORIGINAL_CWD` environment variable (set by `bin/tp.js`).

**How it works:**
```bash
# You run tp from any directory
cd /path/to/project
tp context

# CLI detects:
# 1. Current working directory: /path/to/project
# 2. Searches up for .tp/config.json
# 3. Uses project config if found
# 4. Falls back to global config
```

**Project Discovery:**
- Starts from current directory
- Walks up tree looking for `.tp/config.json`
- Stops at first match or filesystem root
- Uses discovered config for project context

## Troubleshooting

### Problem: Config not being used

**Check configuration sources:**
```bash
tp config show
# Verify which sources are loaded
# Verify expected values are present
```

**Check file locations:**
```bash
# Local config
ls -la .tp/config.json
cat .tp/config.json

# Global config
ls -la ~/.task-pattern/config.json
cat ~/.task-pattern/config.json

# Environment
env | grep LINEAR
```

### Problem: Team filter not working

**Verify team filter is set:**
```bash
tp config show
# Should show: teamFilter: ["TEAM"]

# If not, set it:
tp config teams MYTEAM
```

**Verify team exists:**
```bash
tp config teams
# Interactive menu shows all available teams
# If your team isn't listed, check Linear access
```

### Problem: API key not found

**Check key locations (in order):**
```bash
# 1. Environment variable
echo $LINEAR_API_KEY

# 2. .env file
cat .env | grep LINEAR_API_KEY

# 3. Global config
cat ~/.task-pattern/config.json | grep linearApiKey
```

**Set API key:**
```bash
# In global config (recommended)
echo '{"linearApiKey": "lin_api_xxxxx"}' > ~/.task-pattern/config.json

# Or in .env
echo 'LINEAR_API_KEY=lin_api_xxxxx' >> .env
```

### Problem: Changes not taking effect

**Rebuild after configuration changes:**
```bash
npm run build
```

**Restart if running in dev mode:**
```bash
# Stop dev server (Ctrl+C)
npm run dev
```

**Clear cache (if issues persist):**
```bash
rm -rf node_modules/.cache
npm run build
```

## Security Best Practices

1. **Never commit API keys to git**
   ```bash
   # Add to .gitignore
   echo '.env' >> .gitignore
   echo '.env.*' >> .gitignore
   ```

2. **Use global config for API keys**
   ```json
   // ~/.task-pattern/config.json (not committed)
   {
     "linearApiKey": "lin_api_xxxxx"
   }
   ```

3. **Use project config for team settings**
   ```json
   // .tp/config.json (committed)
   {
     "teamFilter": ["MYTEAM"],
     "defaultTeam": "MYTEAM"
   }
   ```

4. **Rotate API keys periodically**
   - Generate new key in Linear
   - Update in global config or .env
   - Delete old key in Linear

5. **Use environment-specific keys**
   - Development API key for local work
   - Production API key for deployments
   - Never share keys between environments

## Configuration Reference

### Complete Configuration Example

```json
{
  "teamFilter": ["BACKEND", "FRONTEND"],
  "defaultTeam": "BACKEND",
  "activeTeams": ["BACKEND", "FRONTEND", "DESIGN"],
  "workspaceId": "workspace_abc123",
  "linearApiKey": "lin_api_xxxxxxxxxxxxx",
  "backend": "linear"
}
```

### Configuration Schema

```typescript
interface Config {
  teamFilter?: string[];        // Filter issues to these teams
  defaultTeam?: string;         // Default team for new issues
  activeTeams?: string[];       // Teams for selection prompts
  workspaceId?: string;         // Linear workspace ID (optional)
  linearApiKey?: string;        // Linear API key
  backend?: "linear";           // Backend service (only linear)
}
```

## Summary

**Key Points:**
- ✅ Use hierarchical configuration (local > global > env)
- ✅ Store API keys in global config or `.env` (not committed)
- ✅ Store team settings in project config (committed)
- ✅ Each project can have its own team context
- ✅ Use `tp config show` to debug configuration
- ✅ Team members share project config via git

**Quick Setup:**
```bash
# 1. Set up global config with API key
echo '{"linearApiKey": "lin_api_xxx"}' > ~/.task-pattern/config.json

# 2. Create project config
cd project
tp config init
tp config teams MYTEAM

# 3. Commit project config
git add .tp/config.json
git commit -m "chore: add tp configuration"
```

**Resources:**
- [Main Skill Documentation](SKILL.md)
- [Label Templates](label-templates.md)
- [Team Workflows](team-workflows.md)

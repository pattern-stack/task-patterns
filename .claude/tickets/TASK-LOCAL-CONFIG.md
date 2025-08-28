# TASK-LOCAL-CONFIG: Implement Local Configuration Support

## Summary
Add support for project-level configuration to the `tp` CLI tool, allowing team filters and default team settings to be saved per project while keeping sensitive settings like API keys global.

## Problem
Currently all `tp` configuration is stored globally (`~/.config/tp/config.json`), which means:
- Same team filters across all projects
- No project-specific default teams
- Difficult to work with different Linear workspaces/teams per project
- Team settings need to be reconfigured when switching projects

## Solution
Implement a hybrid configuration system that supports both local (project-specific) and global (user-specific) settings with a clear hierarchy.

## Configuration Hierarchy
1. **Local project config** (highest priority)
   - `package.json` with `"tp": {...}` section (Node.js projects)
   - `.tp-config.json` file (non-Node.js projects)
2. **Global user config** (fallback)
   - `~/.config/tp/config.json`
3. **Environment variables** (ultimate fallback)

## Local Settings (Project-specific)
- `defaultTeam`: Default team for creating new tasks
- `teamFilter`: Array of team keys to filter tasks by
- `workspaceId`: Linear workspace ID (for multi-org scenarios)

## Global Settings (User-specific)
- `apiKey`: Linear API key (security sensitive)
- `logLevel`: Debug/info logging preferences
- User display preferences

## Example Configurations

### Node.js Project (package.json)
```json
{
  "name": "my-project",
  "tp": {
    "defaultTeam": "TASK", 
    "teamFilter": ["TASK", "DEV"],
    "workspaceId": "workspace-123"
  }
}
```

### Non-Node.js Project (.tp-config.json)
```json
{
  "defaultTeam": "MOBILE",
  "teamFilter": ["MOBILE", "API"],
  "workspaceId": "workspace-456"
}
```

### Global Config (~/.config/tp/config.json)
```json
{
  "apiKey": "lin_api_...",
  "logLevel": "info"
}
```

## Acceptance Criteria

### Config Discovery
- [ ] Walk up directory tree to find project root with config
- [ ] Check for `package.json` with `"tp"` section first
- [ ] Fall back to `.tp-config.json` if no package.json
- [ ] Cache project root location to avoid repeated filesystem walks
- [ ] Graceful fallback to global config if no local config found

### CLI Commands
- [ ] `tp config show` displays merged local + global config with source indication
- [ ] `tp config init` creates local config in current project
- [ ] `tp config set --local <key> <value>` sets local project setting
- [ ] `tp config set --global <key> <value>` sets global user setting
- [ ] `tp config teams <teams>` sets local team filter
- [ ] Existing commands respect local settings (team filters, default team)

### Migration & Compatibility
- [ ] Existing global configs continue to work unchanged
- [ ] No breaking changes to current CLI behavior
- [ ] Local configs can override global defaults
- [ ] Clear error messages for config validation failures

### Implementation Details
- [ ] Update `ConfigManager` class to handle config hierarchy
- [ ] Add project root discovery utility
- [ ] Modify existing config commands to support `--local`/`--global` flags
- [ ] Update team filtering logic to use local settings
- [ ] Add validation for config file formats

## Technical Notes
- Use existing config system as base, extend for hierarchy
- Consider caching project root discovery for performance
- Validate team keys against Linear API when possible
- Handle missing/invalid config files gracefully

## Priority
Medium - Improves developer experience for multi-project workflows

## Estimate  
4-6 hours

## Dependencies
- Existing config system (`atoms/config/`)
- Team filtering logic (`features/team/`)
- CLI command infrastructure (`organisms/cli/`)
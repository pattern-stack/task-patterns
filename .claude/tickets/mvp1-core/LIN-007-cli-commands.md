# LIN-007: Add CLI Commands for New Services

**Status**: `todo`  
**Priority**: `high`  
**Estimate**: L (5 points)  
**Labels**: `feature`, `cli`, `user-interface`  
**Team**: Engineering  

## Description

Implement CLI commands for all new services (Cycle, Comment, Label, User) to provide complete command-line access to Linear functionality.

## Implementation Details

### File: `src/organisms/cli/commands/cycle.commands.ts`

```typescript
export function cycleCommands(program: Command) {
  const cycle = program.command('cycle').description('Manage Linear cycles');

  cycle
    .command('list')
    .option('--team <teamId>', 'Filter by team')
    .option('--state <state>', 'Filter by state (active|upcoming|completed)')
    .action(async (options) => { /* implementation */ });

  cycle
    .command('create')
    .requiredOption('--team <teamId>', 'Team ID')
    .requiredOption('--name <name>', 'Cycle name')
    .requiredOption('--start <date>', 'Start date (YYYY-MM-DD)')
    .requiredOption('--end <date>', 'End date (YYYY-MM-DD)')
    .option('-d, --description <desc>', 'Description')
    .action(async (options) => { /* implementation */ });

  cycle
    .command('current')
    .requiredOption('--team <teamId>', 'Team ID')
    .action(async (options) => { /* Show active cycle */ });

  cycle
    .command('add-issue <cycleId> <issueId>')
    .action(async (cycleId, issueId) => { /* Add issue to cycle */ });
}
```

### File: `src/organisms/cli/commands/comment.commands.ts`

```typescript
export function commentCommands(program: Command) {
  const comment = program.command('comment').description('Manage issue comments');

  comment
    .command('add <issueId>')
    .requiredOption('-m, --message <text>', 'Comment text')
    .option('--parent <commentId>', 'Reply to comment')
    .action(async (issueId, options) => { /* implementation */ });

  comment
    .command('list <issueId>')
    .option('--limit <n>', 'Number of comments', '10')
    .action(async (issueId, options) => { /* List comments */ });

  comment
    .command('react <commentId> <emoji>')
    .action(async (commentId, emoji) => { /* Add reaction */ });

  comment
    .command('delete <commentId>')
    .confirm('Delete this comment?')
    .action(async (commentId) => { /* Delete comment */ });
}
```

### File: `src/organisms/cli/commands/label.commands.ts`

```typescript
export function labelCommands(program: Command) {
  const label = program.command('label').description('Manage labels');

  label
    .command('create')
    .requiredOption('--name <name>', 'Label name')
    .option('--color <hex>', 'Color in hex format')
    .option('--team <teamId>', 'Team-specific label')
    .option('-d, --description <desc>', 'Description')
    .action(async (options) => { /* implementation */ });

  label
    .command('list')
    .option('--team <teamId>', 'Filter by team')
    .action(async (options) => { /* List labels */ });

  label
    .command('apply <issueId> <labelNames...>')
    .action(async (issueId, labelNames) => { /* Apply labels */ });

  label
    .command('remove <issueId> <labelNames...>')
    .action(async (issueId, labelNames) => { /* Remove labels */ });
}
```

### File: `src/organisms/cli/commands/user.commands.ts`

```typescript
export function userCommands(program: Command) {
  const user = program.command('user').description('Manage users');

  user
    .command('me')
    .action(async () => { /* Show current user */ });

  user
    .command('list')
    .option('--team <teamId>', 'Filter by team')
    .option('--active', 'Only active users')
    .action(async (options) => { /* List users */ });

  user
    .command('assigned <userId>')
    .option('--state <state>', 'Filter by issue state')
    .option('--limit <n>', 'Number of issues', '20')
    .action(async (userId, options) => { /* Show assigned issues */ });

  user
    .command('find <email>')
    .action(async (email) => { /* Find user by email */ });
}
```

### Interactive Features

```typescript
// Add interactive mode for complex operations
import inquirer from 'inquirer';

async function interactiveCycleCreate() {
  const answers = await inquirer.prompt([
    { type: 'list', name: 'team', message: 'Select team:', choices: await getTeams() },
    { type: 'input', name: 'name', message: 'Cycle name:' },
    { type: 'date', name: 'startsAt', message: 'Start date:' },
    { type: 'date', name: 'endsAt', message: 'End date:' },
    { type: 'editor', name: 'description', message: 'Description:' },
  ]);
  return answers;
}
```

## Acceptance Criteria

- [ ] All commands implemented and wired to services
- [ ] Help text and examples for each command
- [ ] Input validation with helpful error messages
- [ ] Interactive prompts for complex operations
- [ ] Output formatting (table, JSON, CSV options)
- [ ] Confirmation prompts for destructive actions
- [ ] Integration tests for CLI commands
- [ ] Auto-completion support where applicable

## Dependencies

- All new services (Cycle, Comment, Label, User)
- Commander.js for CLI framework
- Inquirer.js for interactive prompts
- Chalk for colored output
- Ora for loading spinners

## Notes

- Commands should follow Linear's naming conventions
- Support both IDs and human-readable identifiers
- Provide --json flag for programmatic usage
- Include --dry-run option for testing
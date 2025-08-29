#!/usr/bin/env tsx

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { linearClient } from '@atoms/client/linear-client';
import { IssueAPI } from '@molecules/issue.api';
import { enhancedSettings } from './enhanced-settings';
import { enhancedConfig } from '@atoms/config';
import { createTeamCommand } from './commands/team';
import { createLabelCommand } from './commands/label';
import { createEnhancedConfigCommand } from './commands/enhanced-config';

const program = new Command();

// Get default team from hierarchical config or use 'dug' as fallback
const mergedConfigForDefaults = enhancedConfig.getMergedConfig();
const DEFAULT_TEAM = mergedConfigForDefaults.defaultTeam || process.env.LINEAR_DEFAULT_TEAM || 'dug';

// Friendly welcome message
program
  .name('tp')
  .description('Task Pattern - AI-assisted development workflow (pattern-stack)')
  .version('1.1.0')
  .option('--team <key>', `Override default team (currently: ${DEFAULT_TEAM})`);

// Check our context - what are we working on?
program
  .command('context')
  .alias('c')  // Quick shortcut
  .description('See what we are working on together')
  .action(async () => {
    const spinner = ora('Checking our workspace...').start();
    
    try {
      const client = linearClient.getClient();
      
      // Get active team filter from enhanced settings (hierarchical config)
      const mergedConfig = enhancedConfig.getMergedConfig();
      const activeTeams = mergedConfig.teamFilter;
      
      // Use custom GraphQL query to fetch everything at once
      const query = `
        query IssuesWithRelations($filter: IssueFilter, $first: Int) {
          issues(filter: $filter, first: $first) {
            nodes {
              id
              identifier
              title
              completedAt
              team {
                id
                key
                name
              }
              state {
                id
                name
                type
              }
            }
          }
        }
      `;
      
      const variables = {
        filter: {
          team: activeTeams && activeTeams.length > 0 
            ? { key: { in: activeTeams } }
            : undefined
        },
        first: 50
      };
      
      const result = await client.client.request(query, variables) as any;
      
      spinner.stop();
      
      // Show active team filter if configured
      if (activeTeams && activeTeams.length > 0) {
        console.log(chalk.cyan('\n==> Here is what we are working on ') + chalk.gray(`(teams: ${activeTeams.join(', ')}):\n`));
      } else {
        console.log(chalk.cyan('\n==> Here is what we are working on:\n'));
      }
      
      // Filter and categorize issues based on state
      const inProgress: any[] = [];
      const inReview: any[] = [];
      const inRefinement: any[] = [];
      const ready: any[] = [];
      const todo: any[] = [];
      const recentlyDone: any[] = [];
      
      // Process all issues - data is already fetched, no async operations needed
      for (const issue of result.issues.nodes) {
        const state = issue.state;
        
        if (state?.name === 'In Progress') {
          inProgress.push({ issue, state: state.name });
        } else if (state?.name === 'In Review' || state?.name === 'Validation') {
          inReview.push({ issue, state: state.name });
        } else if (state?.name === 'Refinement' || state?.name === '🔍 Refinement' || state?.name === 'Definition' || state?.name === 'Ideation') {
          inRefinement.push({ issue, state: state.name });
        } else if (state?.name === 'Ready') {
          ready.push({ issue, state: state.name });
        } else if (state?.name === 'Todo' || state?.name === 'ToDo' || state?.name === 'Backlog') {
          todo.push({ issue, state: state.name });
        } else if (state?.name === 'Done' && issue.completedAt) {
          // Check if completed in last 7 days
          const completedDate = new Date(issue.completedAt);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (completedDate > weekAgo) {
            recentlyDone.push({ issue, state: state.name });
          }
        }
      }
      
      if (inProgress.length > 0) {
        console.log(chalk.yellow('  Currently in progress:'));
        inProgress.forEach(({ issue }) => {
          console.log(chalk.white(`    * [${issue.identifier}] ${issue.title}`));
        });
      }
      
      if (inReview.length > 0) {
        console.log(chalk.cyan('\n  In review:'));
        inReview.forEach(({ issue }) => {
          console.log(chalk.white(`    👀 [${issue.identifier}] ${issue.title}`));
        });
      }
      
      if (inRefinement.length > 0) {
        console.log(chalk.magenta('\n  Needs refinement:'));
        inRefinement.forEach(({ issue }) => {
          console.log(chalk.white(`    🔍 [${issue.identifier}] ${issue.title}`));
        });
      }
      
      if (ready.length > 0) {
        console.log(chalk.cyan('\n  Ready to start:'));
        ready.forEach(({ issue }) => {
          console.log(chalk.white(`    ⚡ [${issue.identifier}] ${issue.title}`));
        });
      }
      
      if (todo.length > 0) {
        console.log(chalk.blue('\n  Up next:'));
        todo.slice(0, 5).forEach(({ issue }) => {
          console.log(chalk.gray(`    * [${issue.identifier}] ${issue.title}`));
        });
      }
      
      if (recentlyDone.length > 0) {
        console.log(chalk.green('\n  Recently completed (nice work!):'));
        recentlyDone.slice(0, 3).forEach(({ issue }) => {
          console.log(chalk.dim(`    ✓ [${issue.identifier}] ${issue.title}`));
        });
      }
      
      if (inProgress.length === 0 && inReview.length === 0 && todo.length === 0) {
        console.log(chalk.green('  All clear! Ready to start something new?'));
        console.log(chalk.dim('  Try: tp add "Your next task"'));
      } else if (inProgress.length > 0) {
        console.log(chalk.dim(`\n  Tip: Use 'tp show ${inProgress[0].issue.identifier}' to see details`));
      } else if (inReview.length > 0) {
        console.log(chalk.dim(`\n  Tip: Use 'tp show ${inReview[0].issue.identifier}' to check review status`));
      }
      
    } catch (error) {
      spinner.fail('Could not connect to task backend');
      console.log(chalk.dim('  Make sure your LINEAR_API_KEY is set in .env (Linear backend)'));
      console.log(chalk.dim('  Error:', error));
    }
  });

// Quick add command - for capturing ideas during our conversations  
program
  .command('add <title...>')
  .alias('a')
  .description('Quickly capture a new task')
  .option('-t, --team <team>', 'Override team for this issue')
  .action(async (titleParts, options) => {
    const title = titleParts.join(' ');
    const spinner = ora('Adding to our backlog...').start();
    
    try {
      const client = linearClient.getClient();
      const api = new IssueAPI(client);
      
      // Determine which team to use (command flag > global flag > active team setting > env > default)
      const mergedConfig = enhancedConfig.getMergedConfig();
      const activeTeams = mergedConfig.teamFilter;
      const preferredTeam = activeTeams && activeTeams.length > 0 ? activeTeams[0] : DEFAULT_TEAM;
      const teamKey = options.team || program.opts().team || preferredTeam;
      
      // Try to resolve team key to ID
      const teams = await client.teams();
      const team = teams.nodes.find(t => 
        t.key.toLowerCase() === teamKey.toLowerCase() ||
        t.name.toLowerCase() === teamKey.toLowerCase()
      );
      
      let teamId: string;
      if (team) {
        teamId = team.id;
        // Show helpful message if using team from active filter
        if (!options.team && !program.opts().team && activeTeams && activeTeams.length > 0 && activeTeams[0] === teamKey) {
          console.log(chalk.dim(`  Using team from filter: ${team.name} (${team.key})`));
        }
      } else {
        // If not found, fall back to first team
        teamId = teams.nodes[0]?.id;
        if (teamId) {
          console.log(chalk.yellow(`  Team '${teamKey}' not found, using ${teams.nodes[0]?.name}`));
          if (activeTeams && activeTeams.length > 0) {
            console.log(chalk.dim(`  Tip: Run 'tp config teams ${teams.nodes[0]?.key}' to set this as your default`));
          }
        }
      }
      
      if (!teamId) {
        throw new Error('No teams found in your workspace');
      }
      
      // Create the issue with smart defaults
      const issue = await api.create({
        title,
        teamId,
        description: '(Added via CLI during development session)'
      });
      
      spinner.succeed(chalk.green(`✓ Captured! [${issue.identifier}] - ${issue.title}`));
      console.log(chalk.dim('  We can refine this later as we learn more.'));
      console.log(chalk.dim(`  View at: ${issue.url}`));
      
    } catch (error) {
      spinner.fail('Could not create the issue');
      console.log(chalk.dim('  Error:', error));
    }
  });

// Mark an issue as done - celebrate!
program
  .command('done <identifier>')
  .alias('d')
  .description('Mark an issue as complete')
  .action(async (identifier) => {
    const spinner = ora(`Marking ${identifier} as done...`).start();
    
    try {
      const client = linearClient.getClient();
      
      // Find the issue first
      const issue = await client.issue(identifier);
      if (!issue) {
        spinner.fail(`Could not find issue ${identifier}`);
        return;
      }
      
      // Get the "Done" state for this team
      const team = await issue.team;
      const states = await team?.states();
      const doneState = states?.nodes.find(s => s.name === 'Done' || s.name === 'Completed');
      
      if (!doneState) {
        spinner.fail('Could not find Done state for this team');
        return;
      }
      
      // Update the issue
      await issue.update({ stateId: doneState.id });
      
      spinner.succeed(chalk.green(`🎉 Awesome! ${identifier} is done!`));
      console.log(chalk.dim(`  ${issue.title}`));
      console.log(chalk.cyan('  Great work! What\'s next?'));
      
    } catch (error) {
      spinner.fail(`Could not mark ${identifier} as done`);
      console.log(chalk.dim('  Error:', error));
    }
  });

// Move an issue to in progress
program
  .command('working <identifier>')
  .alias('w')
  .description('Mark an issue as in progress')
  .action(async (identifier) => {
    const spinner = ora(`Moving ${identifier} to in progress...`).start();
    
    try {
      const client = linearClient.getClient();
      
      // Find the issue first
      const issue = await client.issue(identifier);
      if (!issue) {
        spinner.fail(`Could not find issue ${identifier}`);
        return;
      }
      
      // Get the "In Progress" state for this team
      const team = await issue.team;
      const states = await team?.states();
      const inProgressState = states?.nodes.find(s => 
        s.name === 'In Progress' || s.name === 'In Development' || s.name === 'Working'
      );
      
      if (!inProgressState) {
        spinner.fail('Could not find In Progress state for this team');
        return;
      }
      
      // Update the issue
      await issue.update({ stateId: inProgressState.id });
      
      spinner.succeed(chalk.yellow(`💪 Let's do this! Now working on ${identifier}`));
      console.log(chalk.dim(`  ${issue.title}`));
      console.log(chalk.cyan('  Focus time! You got this.'));
      
    } catch (error) {
      spinner.fail(`Could not update ${identifier}`);
      console.log(chalk.dim('  Error:', error));
    }
  });

// Show details of an issue
program
  .command('show <identifier>')
  .alias('s')
  .description('Show details of an issue')
  .action(async (identifier) => {
    const spinner = ora(`Loading ${identifier}...`).start();
    
    try {
      const client = linearClient.getClient();
      
      // Get the issue with relations
      const issue = await client.issue(identifier);
      if (!issue) {
        spinner.fail(`Could not find issue ${identifier}`);
        return;
      }
      
      spinner.stop();
      
      // Display issue details
      console.log(chalk.cyan(`\n==> ${issue.identifier}: ${issue.title}\n`));
      
      const state = await issue.state;
      const assignee = await issue.assignee;
      const team = await issue.team;
      const labels = await issue.labels();
      
      console.log(chalk.gray('  Status:    '), state?.name || 'Unknown');
      console.log(chalk.gray('  Team:      '), team?.name || 'Unknown');
      console.log(chalk.gray('  Assignee:  '), assignee?.name || 'Unassigned');
      console.log(chalk.gray('  Priority:  '), issue.priority ? `P${issue.priority}` : 'None');
      
      if (labels.nodes.length > 0) {
        console.log(chalk.gray('  Labels:    '), labels.nodes.map(l => l.name).join(', '));
      }
      
      if (issue.description) {
        console.log(chalk.gray('\n  Description:'));
        console.log(chalk.dim('  ' + issue.description.replace(/\n/g, '\n  ')));
      }
      
      console.log(chalk.gray('\n  View online: '), chalk.blue(issue.url));
      
      // Show available actions
      if (state?.name !== 'Done') {
        console.log(chalk.dim('\n  Actions:'));
        if (state?.name !== 'In Progress') {
          console.log(chalk.dim(`    • tp working ${identifier} - Start working on this`));
        }
        console.log(chalk.dim(`    • tp done ${identifier} - Mark as complete`));
      }
      
    } catch (error) {
      spinner.fail(`Could not load ${identifier}`);
      console.log(chalk.dim('  Error:', error));
    }
  });

// Update an issue's fields
program
  .command('update <identifier>')
  .alias('u')
  .description('Update an issue\'s fields')
  .option('-t, --title <title>', 'Update issue title')
  .option('-d, --description <description>', 'Update issue description')
  .option('-s, --status <status>', 'Update issue status (e.g., "In Progress", "Done")')
  .option('-p, --priority <priority>', 'Update issue priority (0-4, or urgent/high/medium/low/none)')
  .option('-a, --assign <email>', 'Assign issue to user by email')
  .option('--add-comment <comment>', 'Add a comment to the issue')
  .action(async (identifier, options) => {
    const spinner = ora(`Updating ${identifier}...`).start();
    
    try {
      const client = linearClient.getClient();
      const api = new IssueAPI(client);
      
      // Check if issue exists first
      const issue = await api.getByIdentifier(identifier);
      if (!issue) {
        spinner.fail(`Could not find issue ${identifier}`);
        return;
      }
      
      const updates: string[] = [];
      
      // Update title
      if (options.title) {
        await api.updateIssue(issue.id, { title: options.title });
        updates.push(`title → "${options.title}"`);
      }
      
      // Update description
      if (options.description) {
        await api.updateDescription(issue.id, options.description);
        updates.push('description');
      }
      
      // Update status
      if (options.status) {
        await api.updateStatus(issue.id, options.status);
        updates.push(`status → ${options.status}`);
      }
      
      // Update priority
      if (options.priority !== undefined) {
        // Convert string priority to number if needed
        let priorityNum: number;
        const priorityMap: Record<string, number> = {
          'none': 0, 'low': 1, 'medium': 2, 'high': 3, 'urgent': 4
        };
        
        if (typeof options.priority === 'string' && options.priority in priorityMap) {
          priorityNum = priorityMap[options.priority];
        } else {
          priorityNum = parseInt(options.priority);
        }
        
        if (priorityNum >= 0 && priorityNum <= 4) {
          await api.updatePriority(issue.id, priorityNum as 0 | 1 | 2 | 3 | 4);
          updates.push(`priority → ${options.priority}`);
        } else {
          console.log(chalk.yellow(`  ⚠ Invalid priority: ${options.priority}`));
        }
      }
      
      // Assign to user
      if (options.assign) {
        await api.assignToUser(issue.id, options.assign);
        updates.push(`assigned → ${options.assign}`);
      }
      
      // Add comment
      if (options.addComment) {
        await api.addComment(issue.id, options.addComment);
        updates.push('comment added');
      }
      
      if (updates.length > 0) {
        spinner.succeed(chalk.green(`✓ Updated ${identifier}: ${updates.join(', ')}`));
        console.log(chalk.cyan(`  View at: https://linear.app/${issue.url.split('/').slice(-3).join('/')}`));
      } else {
        spinner.info('No updates specified');
        console.log(chalk.dim('  Use --help to see available options'));
      }
      
    } catch (error: any) {
      spinner.fail(`Could not update ${identifier}`);
      console.log(chalk.dim('  Error:', error.message || error));
    }
  });

// Add comment to an issue
program
  .command('comment <identifier> <message...>')
  .description('Add a comment to an issue')
  .action(async (identifier, messageParts) => {
    const message = messageParts.join(' ');
    const spinner = ora(`Adding comment to ${identifier}...`).start();
    
    try {
      const client = linearClient.getClient();
      const api = new IssueAPI(client);
      
      // Find the issue first
      const issue = await api.getByIdentifier(identifier);
      if (!issue) {
        spinner.fail(`Issue not found: ${identifier}`);
        return;
      }
      
      // Add the comment
      await api.addComment(issue.id, message);
      
      spinner.succeed(chalk.green(`✓ Comment added to ${identifier}`));
      console.log(chalk.dim(`  View at: ${issue.url}`));
      
    } catch (error: any) {
      spinner.fail(`Could not add comment to ${identifier}`);
      console.log(chalk.dim('  Error:', error.message || error));
    }
  });

// List comments on an issue
program
  .command('comments <identifier>')
  .description('Show all comments on an issue')
  .action(async (identifier) => {
    const spinner = ora(`Loading comments for ${identifier}...`).start();
    
    try {
      const client = linearClient.getClient();
      const api = new IssueAPI(client);
      
      // Find the issue first
      const issue = await api.getByIdentifier(identifier);
      if (!issue) {
        spinner.fail(`Issue not found: ${identifier}`);
        return;
      }
      
      // Get comments using the CommentService
      const { CommentService } = await import('@features/comment/service');
      const commentService = new CommentService(client);
      const comments = await commentService.listByIssue(issue.id);
      
      spinner.stop();
      
      console.log(chalk.cyan(`\n==> Comments on ${identifier}: ${issue.title}\n`));
      
      if (comments.nodes.length === 0) {
        console.log(chalk.yellow('  No comments yet'));
      } else {
        for (const comment of comments.nodes) {
          const user = await comment.user;
          const createdAt = new Date(comment.createdAt);
          console.log(chalk.yellow(`  ${user?.name || 'Unknown'} • ${createdAt.toLocaleDateString()}`));
          console.log(chalk.white(`    ${comment.body}`));
          console.log();
        }
      }
      
      console.log(chalk.dim(`  View online: ${issue.url}`));
      
    } catch (error: any) {
      spinner.fail(`Could not load comments for ${identifier}`);
      console.log(chalk.dim('  Error:', error.message || error));
    }
  });

// Register command modules
program.addCommand(createTeamCommand());
program.addCommand(createLabelCommand());
program.addCommand(createEnhancedConfigCommand());

// AI context command - provides everything an AI needs to know
program
  .command('ai-context')
  .description('Show comprehensive context for AI assistants')
  .action(() => {
    console.log(chalk.cyan('\n==> AI Context for task-patterns\n'));
    
    console.log(chalk.yellow('📋 Quick Reference:'));
    console.log(chalk.gray('  Command:       '), 'tp (or pattern, task-pattern)');
    console.log(chalk.gray('  Purpose:       '), 'AI-human collaborative task management');
    console.log(chalk.gray('  Current Team:  '), process.env.LINEAR_DEFAULT_TEAM || 'DUG');
    console.log(chalk.gray('  Backend:       '), 'Linear (more coming)');
    console.log();
    
    console.log(chalk.yellow('🎯 Core Commands:'));
    console.log(chalk.white('  tp context'), chalk.dim('............'), 'See current work (in progress, todo, done)');
    console.log(chalk.white('  tp add "task"'), chalk.dim('.........'), 'Create new task during conversation');
    console.log(chalk.white('  tp working ID'), chalk.dim('.........'), 'Mark as in progress');
    console.log(chalk.white('  tp done ID'), chalk.dim('............'), 'Mark complete (celebrates!)');
    console.log(chalk.white('  tp show ID'), chalk.dim('............'), 'View full details');
    console.log();
    
    console.log(chalk.yellow('👥 Team Management:'));
    console.log(chalk.white('  tp team list'), chalk.dim('..........'), 'List all teams');
    console.log(chalk.white('  tp team create'), chalk.dim('........'), 'Create new team');
    console.log(chalk.white('  tp team stats KEY'), chalk.dim('.....'), 'Team analytics');
    console.log();
    
    console.log(chalk.yellow('🏷️  Label Management:'));
    console.log(chalk.white('  tp labels list'), chalk.dim('........'), 'List all labels');
    console.log(chalk.white('  tp labels create'), chalk.dim('......'), 'Create new label');
    console.log(chalk.white('  tp labels apply-template'), 'Apply label template');
    console.log();
    
    console.log(chalk.yellow('⚙️  Configuration:'));
    console.log(chalk.white('  tp config show'), chalk.dim('........'), 'View current settings');
    console.log(chalk.white('  tp config set'), chalk.dim('.........'), 'Set configuration value');
    console.log(chalk.white('  tp config teams X Y'), chalk.dim('...'), 'Filter to specific teams');
    console.log();
    
    console.log(chalk.yellow('📁 Architecture:'));
    console.log(chalk.gray('  atoms/     '), '→ Foundation (client, types, validators)');
    console.log(chalk.gray('  features/  '), '→ Services (Linear SDK operations)');
    console.log(chalk.gray('  molecules/ '), '→ Domain (entities, workflows, API facades)');
    console.log(chalk.gray('  organisms/ '), '→ Interface (CLI, future MCP)');
    console.log();
    
    console.log(chalk.yellow('🏷️  Label System:'));
    console.log(chalk.gray('  Format:    '), 'group:label (e.g., type:feature, area:tasks)');
    console.log(chalk.gray('  Groups:    '), 'type, area, stage, layer, backend');
    console.log(chalk.gray('  Docs:      '), 'See LABEL_HIERARCHY.md');
    console.log();
    
    console.log(chalk.yellow('🚀 Session Startup:'));
    console.log(chalk.dim('  1. Run "tp context" to see current state'));
    console.log(chalk.dim('  2. Check TASK_PATTERNS_ROADMAP.md for next steps'));
    console.log(chalk.dim('  3. Use "tp add" to track tasks during conversation'));
    console.log(chalk.dim('  4. Commit with Co-Authored-By: Claude'));
    console.log();
    
    console.log(chalk.yellow('💡 Key Points:'));
    console.log(chalk.dim('  • Use IssueAPI facade from molecules layer'));
    console.log(chalk.dim('  • Positive reinforcement in all messages'));
    console.log(chalk.dim('  • We\'re dogfooding - use tp throughout'));
    console.log(chalk.dim('  • Linear is just first backend - stay abstract'));
    console.log(chalk.dim('  • Human doesn\'t know TypeScript - explain simply'));
    console.log();
    
    console.log(chalk.cyan('📖 Full docs: AI_CONTEXT.md'));
    console.log(chalk.cyan('🔗 Repo: github.com/pattern-stack/task-patterns'));
  });

// Helper to show version and a friendly message
program
  .command('hello')
  .description('Say hello!')
  .action(() => {
    console.log(chalk.cyan('\nHello! I am here to help you manage our development work.'));
    console.log(chalk.dim('  Try "tp context" to see what we are working on.\n'));
  });

program.parse(process.argv);

// Show help if no command given
if (!process.argv.slice(2).length) {
  console.log(chalk.cyan('\nWelcome! Let me help you stay organized.\n'));
  program.outputHelp();
}
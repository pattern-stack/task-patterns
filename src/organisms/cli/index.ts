#!/usr/bin/env tsx

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { linearClient } from '@atoms/client/linear-client';
import { IssueAPI } from '@molecules/issue.api';
import { settings } from './settings';

const program = new Command();

// Get default team from environment or use 'dug' as fallback
const DEFAULT_TEAM = process.env.LINEAR_DEFAULT_TEAM || 'dug';

// Friendly welcome message
program
  .name('tp')
  .description('Task Pattern - AI-assisted development workflow (pattern-stack)')
  .version('1.0.0')
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
      const api = new IssueAPI(client);
      
      // Get active team filter from settings
      const activeTeams = settings.get('activeTeams');
      
      // Get recent issues - filter by teams if configured
      const result = await api.list({
        includeArchived: false
      }, { first: 50 });  // Get more initially since we'll filter
      
      spinner.stop();
      
      // Show active team filter if configured
      if (activeTeams && activeTeams.length > 0) {
        console.log(chalk.cyan('\n==> Here is what we are working on ') + chalk.gray(`(teams: ${activeTeams.join(', ')}):\n`));
      } else {
        console.log(chalk.cyan('\n==> Here is what we are working on:\n'));
      }
      
      // Filter by state and team
      const inProgress: any[] = [];
      const todo: any[] = [];
      const recentlyDone: any[] = [];
      
      for (const issue of result.issues) {
        // Filter by team if configured
        if (activeTeams && activeTeams.length > 0) {
          const team = await issue.team;
          if (!team || !activeTeams.includes(team.key)) {
            continue;  // Skip issues not in active teams
          }
        }
        
        const state = await issue.state;
        if (state?.name === 'In Progress') {
          inProgress.push({ issue, state: state.name });
        } else if (state?.name === 'Todo' || state?.name === 'Backlog') {
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
      
      if (inProgress.length === 0 && todo.length === 0) {
        console.log(chalk.green('  All clear! Ready to start something new?'));
        console.log(chalk.dim('  Try: tp add "Your next task"'));
      } else if (inProgress.length > 0) {
        console.log(chalk.dim(`\n  Tip: Use 'tp show ${inProgress[0].issue.identifier}' to see details`));
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
      
      // Determine which team to use (command flag > global flag > env > default)
      const teamKey = options.team || program.opts().team || DEFAULT_TEAM;
      
      // Try to resolve team key to ID
      const teams = await client.teams();
      const team = teams.nodes.find(t => 
        t.key.toLowerCase() === teamKey.toLowerCase() ||
        t.name.toLowerCase() === teamKey.toLowerCase()
      );
      
      let teamId: string;
      if (team) {
        teamId = team.id;
      } else {
        // If not found, fall back to first team
        teamId = teams.nodes[0]?.id;
        console.log(chalk.yellow(`  Team '${teamKey}' not found, using ${teams.nodes[0]?.name}`));
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

// Settings command group
const configCmd = program
  .command('config')
  .description('Manage task-pattern settings');

configCmd
  .command('show')
  .description('Show current settings')
  .action(() => {
    settings.show();
  });

configCmd
  .command('teams [teams...]')
  .description('Set active teams to filter (leave empty to show all)')
  .action((teams) => {
    if (teams && teams.length > 0) {
      settings.set('activeTeams', teams);
      console.log(chalk.green(`✓ Now showing issues from: ${teams.join(', ')}`));
      console.log(chalk.dim('  Run "tp context" to see filtered view'));
    } else {
      settings.clearTeamFilters();
      console.log(chalk.dim('  Run "tp context" to see all teams'));
    }
  });

configCmd
  .command('add-team <teams...>')
  .description('Add teams to active filter')
  .action((teams) => {
    settings.addActiveTeams(...teams);
  });

configCmd
  .command('remove-team <teams...>')
  .description('Remove teams from active filter')
  .action((teams) => {
    settings.removeActiveTeams(...teams);
  });

configCmd
  .command('clear')
  .description('Clear all team filters')
  .action(() => {
    settings.clearTeamFilters();
  });

configCmd
  .command('list-teams')
  .description('List all available teams')
  .action(async () => {
    const spinner = ora('Fetching teams...').start();
    try {
      const client = linearClient.getClient();
      const teams = await client.teams();
      
      spinner.stop();
      console.log(chalk.cyan('\n==> Available Teams:\n'));
      
      teams.nodes.forEach(team => {
        console.log(chalk.gray('  Key:  '), chalk.yellow(team.key));
        console.log(chalk.gray('  Name: '), team.name);
        console.log(chalk.gray('  ID:   '), chalk.dim(team.id));
        console.log();
      });
      
      console.log(chalk.dim(`  Use: tp config teams ${teams.nodes.map(t => t.key).join(' ')}`));
    } catch (error) {
      spinner.fail('Could not fetch teams');
    }
  });

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
    
    console.log(chalk.yellow('⚙️  Configuration:'));
    console.log(chalk.white('  tp config show'), chalk.dim('........'), 'View current settings');
    console.log(chalk.white('  tp config list-teams'), chalk.dim('..'), 'See available teams');
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
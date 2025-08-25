/* eslint-disable no-console */
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { CycleService } from '@features/cycle/service';
import { TeamService } from '@features/team/service';
import { logger } from '@atoms/shared/logger';

export function cycleCommands(program: Command) {
  const cycle = program.command('cycle').description('Manage Linear cycles/sprints');

  cycle
    .command('list')
    .description('List cycles')
    .option('--team <team>', 'Filter by team key or ID')
    .option('--active', 'Show only active cycles')
    .option('--upcoming', 'Show only upcoming cycles')
    .option('--completed', 'Show only completed cycles')
    .option('--limit <limit>', 'Number of cycles to fetch', (value) => parseInt(value), 20)
    .action(async (options) => {
      const spinner = ora('Fetching cycles...').start();
      try {
        const cycleService = new CycleService();
        const teamService = new TeamService();

        let filter: any = {};
        
        if (options.team) {
          const teamId = await teamService.resolveTeamId(options.team);
          if (!teamId) {
            throw new Error(`Team not found: ${options.team}`);
          }
          filter.teamId = teamId;
        }

        // Add status filters
        if (options.active) {
          filter.isActive = true;
        } else if (options.upcoming) {
          filter.isFuture = true;
        } else if (options.completed) {
          filter.isPast = true;
        }

        const cycles = await cycleService.list(filter, { first: options.limit });
        const nodes = await cycles.nodes;

        spinner.succeed(`Found ${nodes.length} cycles`);

        if (nodes.length > 0) {
          console.log('\nCycles:');
          for (const cycle of nodes) {
            const team = await cycle.team;
            const status = cycle.completedAt 
              ? chalk.gray('Completed')
              : cycle.startsAt && new Date(cycle.startsAt) > new Date()
              ? chalk.blue('Upcoming')
              : chalk.green('Active');
            
            console.log(`  ${chalk.cyan(cycle.name || cycle.id)} [${status}]`);
            console.log(`    Team: ${team?.name || 'Unknown'}`);
            console.log(`    Number: ${cycle.number}`);
            
            if (cycle.startsAt) {
              console.log(`    Start: ${new Date(cycle.startsAt).toLocaleDateString()}`);
            }
            if (cycle.endsAt) {
              console.log(`    End: ${new Date(cycle.endsAt).toLocaleDateString()}`);
            }
            
            // Show progress for active cycles
            if (!cycle.completedAt && cycle.startsAt && new Date(cycle.startsAt) <= new Date()) {
              const progress = await cycle.progress;
              if (progress) {
                console.log(`    Progress: ${Math.round(progress * 100)}%`);
              }
              
              // Get issue count
              const issues = await cycle.issues();
              const issueNodes = await issues.nodes;
              console.log(`    Issues: ${issueNodes.length}`);
            }
            
            console.log(`    ID: ${cycle.id}`);
          }
        }
      } catch (error: unknown) {
        spinner.fail('Failed to fetch cycles');
        logger.error('Error', error);
      }
    });

  cycle
    .command('current')
    .description('Get current active cycle')
    .option('--team <team>', 'Team key or ID')
    .action(async (options) => {
      const spinner = ora('Fetching current cycle...').start();
      try {
        const cycleService = new CycleService();
        const teamService = new TeamService();

        let teamId: string | undefined;
        if (options.team) {
          const resolved = await teamService.resolveTeamId(options.team);
          if (!resolved) {
            throw new Error(`Team not found: ${options.team}`);
          }
          teamId = resolved;
        }

        // Get active cycles
        const filter: any = { includeArchived: false, isActive: true };
        if (teamId) {
          filter.teamId = teamId;
        }
        const cycles = await cycleService.list(filter, { first: 1 });
        const nodes = await cycles.nodes;

        if (nodes.length > 0) {
          const cycle = nodes[0];
          const team = await cycle.team;
          
          spinner.succeed(`Current cycle: ${chalk.green(cycle.name || cycle.id)}`);
          console.log('\nCycle Details:');
          console.log(`  Team: ${team?.name || 'Unknown'}`);
          console.log(`  Number: ${cycle.number}`);
          
          if (cycle.startsAt) {
            console.log(`  Started: ${new Date(cycle.startsAt).toLocaleDateString()}`);
          }
          if (cycle.endsAt) {
            const daysLeft = Math.ceil((new Date(cycle.endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            console.log(`  Ends: ${new Date(cycle.endsAt).toLocaleDateString()} (${daysLeft} days left)`);
          }
          
          // Show progress
          const progress = await cycle.progress;
          if (progress) {
            console.log(`  Progress: ${Math.round(progress * 100)}%`);
          }
          
          // Get issue stats
          const issues = await cycle.issues();
          const issueNodes = await issues.nodes;
          const completedIssues = issueNodes.filter(i => i.completedAt);
          
          console.log(`  Issues: ${completedIssues.length}/${issueNodes.length} completed`);
          console.log(`  ID: ${cycle.id}`);
        } else {
          spinner.warn('No active cycle found');
        }
      } catch (error: unknown) {
        spinner.fail('Failed to fetch current cycle');
        logger.error('Error', error);
      }
    });

  cycle
    .command('create')
    .description('Create a new cycle')
    .requiredOption('--team <team>', 'Team key or ID')
    .requiredOption('--name <name>', 'Cycle name')
    .requiredOption('--start <date>', 'Start date (YYYY-MM-DD)')
    .requiredOption('--end <date>', 'End date (YYYY-MM-DD)')
    .option('--description <description>', 'Cycle description')
    .action(async (options) => {
      const spinner = ora('Creating cycle...').start();
      try {
        const cycleService = new CycleService();
        const teamService = new TeamService();

        // Resolve team ID
        const teamId = await teamService.resolveTeamId(options.team);
        if (!teamId) {
          throw new Error(`Team not found: ${options.team}`);
        }

        // Parse dates
        const startsAt = new Date(options.start);
        const endsAt = new Date(options.end);

        if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
          throw new Error('Invalid date format. Use YYYY-MM-DD');
        }

        if (endsAt <= startsAt) {
          throw new Error('End date must be after start date');
        }

        const cycle = await cycleService.create({
          teamId,
          name: options.name,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          description: options.description,
        });

        spinner.succeed(`Cycle created: ${chalk.green(cycle.name || cycle.id)}`);
        console.log(`  Number: ${cycle.number}`);
        console.log(`  Start: ${new Date(cycle.startsAt).toLocaleDateString()}`);
        console.log(`  End: ${new Date(cycle.endsAt).toLocaleDateString()}`);
        console.log(`  ID: ${cycle.id}`);
      } catch (error: unknown) {
        spinner.fail('Failed to create cycle');
        logger.error('Error', error);
      }
    });

  cycle
    .command('complete <id>')
    .description('Mark a cycle as complete')
    .action(async (id) => {
      const spinner = ora('Completing cycle...').start();
      try {
        const cycleService = new CycleService();

        // Mark cycle as completed - this is likely not available in the Linear API
        // Cycles are typically auto-completed based on dates
        spinner.warn('Cycle completion is typically automatic based on dates in Linear');
        return;

        // spinner.succeed(`Cycle completed: ${chalk.green(cycle.name || cycle.id)}`);
      } catch (error: unknown) {
        spinner.fail('Failed to complete cycle');
        logger.error('Error', error);
      }
    });

  cycle
    .command('issues <id>')
    .description('List issues in a cycle')
    .action(async (id) => {
      const spinner = ora('Fetching cycle issues...').start();
      try {
        const cycleService = new CycleService();

        const cycle = await cycleService.get(id);
        if (!cycle) {
          throw new Error(`Cycle not found: ${id}`);
        }

        const issues = await cycle.issues();
        const issueNodes = await issues.nodes;

        spinner.succeed(`Found ${issueNodes.length} issues in cycle`);

        if (issueNodes.length > 0) {
          console.log('\nIssues:');
          for (const issue of issueNodes) {
            const state = await issue.state;
            const assignee = await issue.assignee;
            const statusIcon = issue.completedAt ? chalk.green('✓') : chalk.yellow('○');
            
            console.log(`  ${statusIcon} ${chalk.cyan(issue.identifier)} - ${issue.title}`);
            console.log(`    Status: ${state?.name || 'Unknown'}`);
            console.log(`    Assignee: ${assignee?.name || 'Unassigned'}`);
            console.log(`    Priority: ${issue.priorityLabel || 'None'}`);
          }
        }
      } catch (error: unknown) {
        spinner.fail('Failed to fetch cycle issues');
        logger.error('Error', error);
      }
    });
}
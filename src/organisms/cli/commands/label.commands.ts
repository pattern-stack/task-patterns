/* eslint-disable no-console */
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { LabelService } from '@features/label/service';
import { TeamService } from '@features/team/service';
import { IssueEntity } from '@molecules/entities/issue.entity';
import { logger } from '@atoms/shared/logger';

export function labelCommands(program: Command) {
  const label = program.command('label').description('Manage Linear labels');

  label
    .command('list')
    .description('List all labels')
    .option('--team <team>', 'Filter by team key or ID')
    .option('--limit <limit>', 'Number of labels to fetch', (value) => parseInt(value), 50)
    .action(async (options) => {
      const spinner = ora('Fetching labels...').start();
      try {
        const labelService = new LabelService();
        const teamService = new TeamService();

        let teamId: string | undefined;
        if (options.team) {
          const resolved = await teamService.resolveTeamId(options.team);
          if (!resolved) {
            throw new Error(`Team not found: ${options.team}`);
          }
          teamId = resolved;
        }

        const labels = await labelService.list(
          teamId ? { includeArchived: false, teamId } : { includeArchived: false },
          { first: options.limit }
        );
        const nodes = await labels.nodes;

        spinner.succeed(`Found ${nodes.length} labels`);

        if (nodes.length > 0) {
          console.log('\nLabels:');
          for (const label of nodes) {
            const color = label.color ? chalk.hex(label.color) : chalk.white;
            console.log(`  ${color('●')} ${label.name}`);
            console.log(`    ID: ${label.id}`);
            if (label.description) {
              console.log(`    Description: ${label.description}`);
            }
            const team = await label.team;
            if (team) {
              console.log(`    Team: ${team.name}`);
            }
          }
        }
      } catch (error: unknown) {
        spinner.fail('Failed to fetch labels');
        logger.error('Error', error);
      }
    });

  label
    .command('create <name>')
    .description('Create a new label')
    .requiredOption('--team <team>', 'Team key or ID')
    .option('--color <color>', 'Hex color code (e.g., #FF0000)')
    .option('--description <description>', 'Label description')
    .action(async (name, options) => {
      const spinner = ora('Creating label...').start();
      try {
        const labelService = new LabelService();
        const teamService = new TeamService();

        // Resolve team ID
        const teamId = await teamService.resolveTeamId(options.team);
        if (!teamId) {
          throw new Error(`Team not found: ${options.team}`);
        }

        const label = await labelService.create({
          name,
          teamId,
          color: options.color,
          description: options.description,
        });

        spinner.succeed(`Label created: ${chalk.green(label.name)}`);
        console.log(`  ID: ${label.id}`);
      } catch (error: unknown) {
        spinner.fail('Failed to create label');
        logger.error('Error', error);
      }
    });

  label
    .command('apply <issueIdentifier> <labelNames...>')
    .description('Apply labels to an issue')
    .action(async (issueIdentifier, labelNames) => {
      const spinner = ora('Applying labels to issue...').start();
      try {
        const labelService = new LabelService();
        const issueEntity = new IssueEntity();

        // Get the issue
        let issue;
        if (issueIdentifier.includes('-')) {
          issue = await issueEntity.getByIdentifier(issueIdentifier);
        } else {
          issue = await issueEntity.get(issueIdentifier);
        }

        if (!issue) {
          throw new Error(`Issue not found: ${issueIdentifier}`);
        }

        // Get the team ID from the issue
        const team = await issue.team;
        const teamId = team?.id;

        // Get label IDs by name
        const labelIds: string[] = [];
        for (const labelName of labelNames) {
          // First try team-specific label, then workspace label
          let label = await labelService.getByName(labelName, teamId);
          if (!label) {
            // Try workspace-level label
            label = await labelService.getByName(labelName);
          }
          if (label) {
            labelIds.push(label.id);
          } else {
            spinner.warn(`Label not found: ${labelName}`);
          }
        }

        if (labelIds.length === 0) {
          throw new Error('No valid labels found');
        }

        // Apply labels to the issue
        const updatedIssue = await issueEntity.addLabels(issue.id, labelIds);
        
        spinner.succeed(`Applied ${labelIds.length} label(s) to ${updatedIssue.identifier}`);
      } catch (error: unknown) {
        spinner.fail('Failed to apply labels');
        logger.error('Error', error);
      }
    });

  label
    .command('remove <issueIdentifier> <labelNames...>')
    .description('Remove labels from an issue')
    .action(async (issueIdentifier, labelNames) => {
      const spinner = ora('Removing labels from issue...').start();
      try {
        const labelService = new LabelService();
        const issueEntity = new IssueEntity();

        // Get the issue
        let issue;
        if (issueIdentifier.includes('-')) {
          issue = await issueEntity.getByIdentifier(issueIdentifier);
        } else {
          issue = await issueEntity.get(issueIdentifier);
        }

        if (!issue) {
          throw new Error(`Issue not found: ${issueIdentifier}`);
        }

        // Get the team ID from the issue
        const team = await issue.team;
        const teamId = team?.id;

        // Get label IDs by name
        const labelIds: string[] = [];
        for (const labelName of labelNames) {
          // First try team-specific label, then workspace label
          let label = await labelService.getByName(labelName, teamId);
          if (!label) {
            // Try workspace-level label
            label = await labelService.getByName(labelName);
          }
          if (label) {
            labelIds.push(label.id);
          } else {
            spinner.warn(`Label not found: ${labelName}`);
          }
        }

        if (labelIds.length === 0) {
          throw new Error('No valid labels found');
        }

        // Remove labels from the issue
        const updatedIssue = await issueEntity.removeLabels(issue.id, labelIds);
        
        spinner.succeed(`Removed ${labelIds.length} label(s) from ${updatedIssue.identifier}`);
      } catch (error: unknown) {
        spinner.fail('Failed to remove labels');
        logger.error('Error', error);
      }
    });

  label
    .command('delete <name>')
    .description('Delete a label')
    .requiredOption('--team <team>', 'Team key or ID')
    .action(async (name, options) => {
      const spinner = ora('Deleting label...').start();
      try {
        const labelService = new LabelService();
        const teamService = new TeamService();

        // Resolve team ID
        const teamId = await teamService.resolveTeamId(options.team);
        if (!teamId) {
          throw new Error(`Team not found: ${options.team}`);
        }

        // Find the label
        const labels = await labelService.list({ includeArchived: false, teamId }, { first: 100 });
        const nodes = await labels.nodes;
        const label = nodes.find(l => l.name === name);

        if (!label) {
          throw new Error(`Label not found: ${name}`);
        }

        await labelService.delete(label.id);
        spinner.succeed(`Label deleted: ${name}`);
      } catch (error: unknown) {
        spinner.fail('Failed to delete label');
        logger.error('Error', error);
      }
    });
}
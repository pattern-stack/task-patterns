/* eslint-disable no-console */
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { IssueEntity, QuickCreateOptions } from '@molecules/entities/issue.entity';
import { BulkOperationsWorkflow } from '@molecules/workflows/bulk-operations.workflow';
import { SmartSearchWorkflow } from '@molecules/workflows/smart-search.workflow';
import { logger } from '@atoms/shared/logger';

export function issueManagerCommands(program: Command) {
  const issueEntity = new IssueEntity();
  const bulkWorkflow = new BulkOperationsWorkflow();
  const searchWorkflow = new SmartSearchWorkflow();

  // Create bulk operations command group
  const bulk = program.command('bulk').description('Bulk operations on issues');

  // Quick create command
  program
    .command('create <title>')
    .description('Quick create an issue with smart defaults')
    .requiredOption('--team <key>', 'Team key (e.g., eng, design)')
    .option('-d, --description <description>', 'Issue description')
    .option('-a, --assign <email>', 'Assignee email or username')
    .option('-p, --priority <level>', 'Priority (urgent, high, medium, low)', 'medium')
    .option('-l, --labels <labels>', 'Comma-separated label names')
    .option('--project <name>', 'Project name')
    .option('--parent <identifier>', 'Parent issue identifier')
    .option('--due <date>', 'Due date (YYYY-MM-DD)')
    .action(async (title, options) => {
      const spinner = ora('Creating issue...').start();
      try {
        const createOptions: QuickCreateOptions = {
          description: options.description,
          assignee: options.assign,
          labels: options.labels?.split(',').map((l: string) => l.trim()),
          project: options.project,
          parent: options.parent,
        };

        // Convert priority name to number
        const priorityMap: Record<string, number> = {
          urgent: 1,
          high: 2,
          medium: 3,
          low: 4,
        };
        if (options.priority) {
          createOptions.priority =
            (priorityMap[options.priority.toLowerCase()] as 0 | 1 | 2 | 3 | 4) || 3;
        }

        // Parse due date if provided
        if (options.due) {
          createOptions.dueDate = new Date(options.due);
        }

        const result = await issueEntity.quickCreate(title, options.team, createOptions);

        spinner.succeed(`Issue created: ${chalk.green(result.identifier)} - ${result.issue.title}`);
        console.log(chalk.gray(`URL: ${result.url}`));

        if (result.warnings && result.warnings.length > 0) {
          console.log(chalk.yellow('\nWarnings:'));
          result.warnings.forEach((warning) => {
            console.log(chalk.yellow(`  • ${warning}`));
          });
        }
      } catch (error: unknown) {
        spinner.fail('Failed to create issue');
        logger.error('Error', error);
      }
    });

  // Move issues to status
  program
    .command('move <identifiers...>')
    .description('Move issues to a new status')
    .requiredOption('--to <status>', 'Target status name (e.g., "In Progress", "Done")')
    .option('-c, --comment <comment>', 'Add comment when moving')
    .action(async (identifiers, options) => {
      const spinner = ora(`Moving ${identifiers.length} issue(s) to ${options.to}...`).start();
      try {
        const result = await bulkWorkflow.moveToStatus(identifiers, options.to, options.comment);

        if (result.successCount === result.totalCount) {
          spinner.succeed(`All ${result.totalCount} issues moved to ${options.to}`);
        } else {
          spinner.warn(result.summary);
        }

        // Show successfully moved issues
        if (result.successCount > 0) {
          console.log(chalk.green('\nSuccessfully moved:'));
          result.updated.forEach((issue) => {
            console.log(chalk.green(`  ✓ ${issue.identifier} - ${issue.title}`));
          });
        }

        // Show failed issues
        if (result.failureCount > 0) {
          console.log(chalk.red('\nFailed to move:'));
          result.failed.forEach((failure) => {
            console.log(chalk.red(`  ✗ ${failure.identifier}: ${failure.error}`));
          });
        }
      } catch (error: unknown) {
        spinner.fail('Failed to move issues');
        logger.error('Error', error);
      }
    });

  // Smart search
  program
    .command('search <query...>')
    .description('Search issues using natural language')
    .option('--team <key>', 'Filter by team key')
    .option('--limit <n>', 'Maximum results', '20')
    .option('--archived', 'Include archived issues')
    .action(async (queryParts, options) => {
      const query = queryParts.join(' ');
      const spinner = ora(`Searching: "${query}"...`).start();
      try {
        const result = await searchWorkflow.search(query, {
          team: options.team,
          limit: parseInt(options.limit),
        });

        spinner.succeed(
          `Found ${result.issues.length} issue(s) (confidence: ${Math.round(result.confidence * 100)}%)`,
        );

        // Display issues
        if (result.issues.length > 0) {
          console.log('\nResults:');
          for (const issue of result.issues) {
            const state = await issue.state;
            const assignee = await issue.assignee;
            console.log(`  ${chalk.cyan(issue.identifier)} ${issue.title}`);
            console.log(
              `    ${chalk.gray('Status:')} ${state?.name || 'Unknown'} | ` +
                `${chalk.gray('Assignee:')} ${assignee?.name || 'Unassigned'} | ` +
                `${chalk.gray('Priority:')} ${issue.priority || 'None'}`,
            );
          }
        }

        // Show suggestions if any
        if (result.suggestions && result.suggestions.length > 0) {
          console.log(chalk.yellow('\nSuggestions:'));
          result.suggestions.forEach((suggestion) => {
            console.log(chalk.yellow(`  • ${suggestion}`));
          });
        }

        // Show applied filters for transparency
        if (Object.keys(result.appliedFilters).length > 0) {
          console.log(chalk.gray('\nApplied filters:'));
          console.log(chalk.gray(JSON.stringify(result.appliedFilters, null, 2)));
        }
      } catch (error: unknown) {
        spinner.fail('Search failed');
        logger.error('Error', error);
      }
    });

  // Bulk assign
  program
    .command('assign <identifiers...>')
    .description('Bulk assign issues to a user')
    .requiredOption('--to <email>', 'Assignee email or username')
    .action(async (identifiers, options) => {
      const spinner = ora(`Assigning ${identifiers.length} issue(s) to ${options.to}...`).start();
      try {
        const result = await bulkWorkflow.bulkAssign(identifiers, options.to);

        if (result.successCount === result.totalCount) {
          spinner.succeed(result.summary);
        } else {
          spinner.warn(result.summary);
        }

        // Show successfully assigned issues
        if (result.successCount > 0) {
          console.log(chalk.green('\nSuccessfully assigned:'));
          result.updated.forEach((issue) => {
            console.log(chalk.green(`  ✓ ${issue.identifier} - ${issue.title}`));
          });
        }

        // Show failed issues
        if (result.failureCount > 0) {
          console.log(chalk.red('\nFailed to assign:'));
          result.failed.forEach((failure) => {
            console.log(chalk.red(`  ✗ ${failure.identifier}: ${failure.error}`));
          });
        }
      } catch (error: unknown) {
        spinner.fail('Bulk assign failed');
        logger.error('Error', error);
      }
    });

  // Quick comment
  program
    .command('comment <identifier> <comment...>')
    .description('Add a quick comment to an issue')
    .option('--private', 'Make comment private')
    .action(async (identifier, commentParts) => {
      const comment = commentParts.join(' ');
      const spinner = ora(`Adding comment to ${identifier}...`).start();
      try {
        const issue = await issueEntity.resolveIdentifier(identifier);
        if (!issue) {
          throw new Error(`Issue ${identifier} not found`);
        }
        const createdComment = await issueEntity.addCommentToIssue(issue.id, comment);

        spinner.succeed(`Comment added to ${identifier}`);
        const author = await createdComment.user;
        console.log(chalk.gray(`By: ${author?.name || 'Unknown'}`));
        console.log(chalk.gray(`Comment: ${createdComment.body.substring(0, 100)}...`));
      } catch (error: unknown) {
        spinner.fail('Failed to add comment');
        logger.error('Error', error);
      }
    });

  // Resolve identifier (utility command)
  program
    .command('resolve <identifier>')
    .description('Resolve an issue identifier to see full details')
    .action(async (identifier) => {
      const spinner = ora(`Resolving ${identifier}...`).start();
      try {
        const issue = await issueEntity.resolveIdentifier(identifier);

        if (issue) {
          spinner.succeed(`Found: ${chalk.green(issue.identifier)}`);
          const state = await issue.state;
          const assignee = await issue.assignee;
          const team = await issue.team;

          console.log('\nIssue Details:');
          console.log(`  Title: ${issue.title}`);
          console.log(`  State: ${state?.name || 'Unknown'}`);
          console.log(`  Team: ${team?.name || 'Unknown'}`);
          console.log(`  Assignee: ${assignee?.name || 'Unassigned'}`);
          console.log(`  Priority: ${issue.priority || 'None'}`);
          console.log(`  URL: ${issue.url}`);
        } else {
          spinner.fail(`Could not resolve identifier: ${identifier}`);
        }
      } catch (error: unknown) {
        spinner.fail('Failed to resolve identifier');
        logger.error('Error', error);
      }
    });

  // Bulk operations
  bulk
    .command('move <identifiers...>')
    .description('Move multiple issues to a new status')
    .requiredOption('--to <status>', 'Target status name')
    .option('--comment <comment>', 'Add comment to all moved issues')
    .action(async (identifiers, options) => {
      const spinner = ora(`Moving ${identifiers.length} issues to ${options.to}...`).start();
      try {
        const result = await bulkWorkflow.moveToStatus(identifiers, options.to, options.comment);

        if (result.successCount > 0) {
          spinner.succeed(
            `Moved ${result.successCount}/${result.totalCount} issues to ${options.to}`,
          );
        } else {
          spinner.fail(`Failed to move issues`);
        }

        if (result.failed && result.failed.length > 0) {
          console.log(chalk.red('\nFailed issues:'));
          for (const failure of result.failed) {
            console.log(`  ✗ ${failure.identifier}: ${failure.error}`);
          }
        }
      } catch (error: unknown) {
        spinner.fail('Bulk move failed');
        logger.error('Error', error);
      }
    });

  bulk
    .command('assign <identifiers...>')
    .description('Assign multiple issues to a user')
    .requiredOption('--to <email>', 'Assignee email or username')
    .action(async (identifiers, options) => {
      const spinner = ora(`Assigning ${identifiers.length} issues to ${options.to}...`).start();
      try {
        const result = await bulkWorkflow.bulkAssign(identifiers, options.to);

        if (result.successCount > 0) {
          spinner.succeed(
            `Assigned ${result.successCount}/${result.totalCount} issues to ${options.to}`,
          );
        } else {
          spinner.fail(`Failed to assign issues`);
        }

        if (result.failed && result.failed.length > 0) {
          console.log(chalk.red('\nFailed issues:'));
          for (const failure of result.failed) {
            console.log(`  ✗ ${failure.identifier}: ${failure.error}`);
          }
        }
      } catch (error: unknown) {
        spinner.fail('Bulk assign failed');
        logger.error('Error', error);
      }
    });

  bulk
    .command('close <identifiers...>')
    .description('Close multiple issues')
    .option('--comment <comment>', 'Add comment to all closed issues')
    .action(async (identifiers, options) => {
      const spinner = ora(`Closing ${identifiers.length} issues...`).start();
      try {
        // Use moveToStatus with "Done" or "Closed" status
        const result = await bulkWorkflow.moveToStatus(identifiers, 'Done', options.comment);

        if (result.successCount > 0) {
          spinner.succeed(`Closed ${result.successCount}/${result.totalCount} issues`);
        } else {
          spinner.fail(`Failed to close issues`);
        }

        if (result.failed && result.failed.length > 0) {
          console.log(chalk.red('\nFailed issues:'));
          for (const failure of result.failed) {
            console.log(`  ✗ ${failure.identifier}: ${failure.error}`);
          }
        }
      } catch (error: unknown) {
        spinner.fail('Bulk close failed');
        logger.error('Error', error);
      }
    });

  bulk
    .command('priority <identifiers...>')
    .description('Change priority of multiple issues')
    .requiredOption('--level <level>', 'Priority level (urgent, high, medium, low, none)')
    .action(async (identifiers, options) => {
      const spinner = ora(
        `Changing priority of ${identifiers.length} issues to ${options.level}...`,
      ).start();
      try {
        const priorityMap: Record<string, number> = {
          urgent: 1,
          high: 2,
          medium: 3,
          low: 4,
          none: 0,
        };

        const priority = priorityMap[options.level.toLowerCase()];
        if (priority === undefined) {
          throw new Error('Invalid priority level. Use: urgent, high, medium, low, or none');
        }

        const result = await bulkWorkflow.bulkUpdatePriority(identifiers, priority);

        if (result.successCount === result.totalCount) {
          spinner.succeed(result.summary);
        } else {
          spinner.warn(result.summary);
        }

        // Show failed issues
        if (result.failureCount > 0) {
          console.log(chalk.red('\nFailed to update:'));
          result.failed.forEach((failure) => {
            console.log(chalk.red(`  ✗ ${failure.identifier}: ${failure.error}`));
          });
        }
      } catch (error: unknown) {
        spinner.fail('Bulk priority change failed');
        logger.error('Error', error);
      }
    });
}

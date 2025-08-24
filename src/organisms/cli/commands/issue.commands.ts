import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { IssueEntity } from '@molecules/entities/issue.entity';
import { IssueCreate, IssueUpdate } from '@features/issue/schemas';
import { logger } from '@atoms/shared/logger';

export function issueCommands(program: Command) {
  const issue = program
    .command('issue')
    .description('Manage Linear issues');

  issue
    .command('create')
    .description('Create a new issue')
    .requiredOption('-t, --title <title>', 'Issue title')
    .requiredOption('--team <teamId>', 'Team ID')
    .option('-d, --description <description>', 'Issue description')
    .option('-a, --assignee <assigneeId>', 'Assignee ID')
    .option('-p, --priority <priority>', 'Priority (0-4)', (value) => parseInt(value))
    .option('--project <projectId>', 'Project ID')
    .option('--cycle <cycleId>', 'Cycle ID')
    .option('--estimate <estimate>', 'Estimate', (value) => parseInt(value))
    .option('--labels <labelIds>', 'Comma-separated label IDs')
    .action(async (options) => {
      const spinner = ora('Creating issue...').start();
      try {
        const issueEntity = new IssueEntity();
        
        const data: IssueCreate = {
          title: options.title,
          teamId: options.team,
          description: options.description,
          assigneeId: options.assignee,
          priority: options.priority,
          projectId: options.project,
          cycleId: options.cycle,
          estimate: options.estimate,
          labelIds: options.labels?.split(','),
        };

        const issue = await issueEntity.create(data);
        spinner.succeed(`Issue created: ${chalk.green(issue.identifier)} - ${issue.title}`);
        console.log(chalk.gray(`URL: ${issue.url}`));
      } catch (error: any) {
        spinner.fail('Failed to create issue');
        logger.error('Error', error);
      }
    });

  issue
    .command('get <identifier>')
    .description('Get an issue by ID or identifier')
    .option('--with-relations', 'Include related data')
    .action(async (identifier, options) => {
      const spinner = ora('Fetching issue...').start();
      try {
        const issueEntity = new IssueEntity();
        
        let issue;
        if (identifier.includes('-')) {
          issue = await issueEntity.getByIdentifier(identifier);
        } else {
          if (options.withRelations) {
            const result = await issueEntity.getWithRelations(identifier);
            if (result) {
              spinner.succeed(`Found issue: ${chalk.green(result.issue.identifier)}`);
              const state = result.issue.state ? await result.issue.state : null;
              console.log('\nIssue Details:');
              console.log(`  Title: ${result.issue.title}`);
              console.log(`  State: ${state?.name || 'Unknown'}`);
              console.log(`  Priority: ${result.issue.priority || 'None'}`);
              console.log(`  Assignee: ${result.assignee?.name || 'Unassigned'}`);
              console.log(`  Team: ${result.team?.name || 'Unknown'}`);
              console.log(`  Project: ${result.project?.name || 'None'}`);
              console.log(`  Comments: ${result.comments?.length || 0}`);
              console.log(`  Labels: ${result.labels?.map(l => l.name).join(', ') || 'None'}`);
              console.log(`  URL: ${result.issue.url}`);
              return;
            }
          } else {
            issue = await issueEntity.get(identifier);
          }
        }

        if (issue) {
          spinner.succeed(`Found issue: ${chalk.green(issue.identifier)}`);
          console.log('\nIssue Details:');
          console.log(`  Title: ${issue.title}`);
          console.log(`  Description: ${issue.description || 'No description'}`);
          console.log(`  Priority: ${issue.priority || 'None'}`);
          console.log(`  Estimate: ${issue.estimate || 'None'}`);
          console.log(`  URL: ${issue.url}`);
        } else {
          spinner.fail('Issue not found');
        }
      } catch (error: any) {
        spinner.fail('Failed to fetch issue');
        logger.error('Error', error);
      }
    });

  issue
    .command('update <id>')
    .description('Update an issue')
    .option('-t, --title <title>', 'Issue title')
    .option('-d, --description <description>', 'Issue description')
    .option('-a, --assignee <assigneeId>', 'Assignee ID')
    .option('-p, --priority <priority>', 'Priority (0-4)', (value) => parseInt(value))
    .option('--project <projectId>', 'Project ID')
    .option('--cycle <cycleId>', 'Cycle ID')
    .option('--estimate <estimate>', 'Estimate', (value) => parseInt(value))
    .option('--state <stateId>', 'State ID')
    .action(async (id, options) => {
      const spinner = ora('Updating issue...').start();
      try {
        const issueEntity = new IssueEntity();
        
        const data: IssueUpdate = {};
        if (options.title) data.title = options.title;
        if (options.description) data.description = options.description;
        if (options.assignee) data.assigneeId = options.assignee;
        if (options.priority !== undefined) data.priority = options.priority;
        if (options.project) data.projectId = options.project;
        if (options.cycle) data.cycleId = options.cycle;
        if (options.estimate !== undefined) data.estimate = options.estimate;
        if (options.state) data.stateId = options.state;

        const issue = await issueEntity.update(id, data);
        spinner.succeed(`Issue updated: ${chalk.green(issue.identifier)}`);
      } catch (error: any) {
        spinner.fail('Failed to update issue');
        logger.error('Error', error);
      }
    });

  issue
    .command('list')
    .description('List issues')
    .option('--team <teamId>', 'Filter by team ID')
    .option('--assignee <assigneeId>', 'Filter by assignee ID')
    .option('--project <projectId>', 'Filter by project ID')
    .option('--cycle <cycleId>', 'Filter by cycle ID')
    .option('--state <state>', 'Filter by state')
    .option('--priority <priority>', 'Filter by priority', (value) => parseInt(value))
    .option('--search <query>', 'Search query')
    .option('--limit <limit>', 'Number of issues to fetch', (value) => parseInt(value), 20)
    .action(async (options) => {
      const spinner = ora('Fetching issues...').start();
      try {
        const issueEntity = new IssueEntity();
        
        const filter: any = {};
        if (options.team) filter.teamId = options.team;
        if (options.assignee) filter.assigneeId = options.assignee;
        if (options.project) filter.projectId = options.project;
        if (options.cycle) filter.cycleId = options.cycle;
        if (options.state) filter.state = options.state;
        if (options.priority !== undefined) filter.priority = options.priority;
        if (options.search) filter.searchQuery = options.search;

        const result = await issueEntity.list(filter, { first: options.limit });
        
        spinner.succeed(`Found ${result.issues.length} issues`);
        
        if (result.issues.length > 0) {
          console.log('\nIssues:');
          for (const issue of result.issues) {
            const priority = issue.priority ? `P${issue.priority}` : 'None';
            const assigneeObj = issue.assignee ? await issue.assignee : null;
            const assignee = assigneeObj?.name || 'Unassigned';
            const stateObj = issue.state ? await issue.state : null;
            console.log(`  ${chalk.green(issue.identifier)} - ${issue.title}`);
            console.log(`    Priority: ${priority} | Assignee: ${assignee} | State: ${stateObj?.name || 'Unknown'}`);
          }
        }
      } catch (error: any) {
        spinner.fail('Failed to fetch issues');
        logger.error('Error', error);
      }
    });

  issue
    .command('delete <id>')
    .description('Delete an issue')
    .option('--confirm', 'Skip confirmation')
    .action(async (id, options) => {
      if (!options.confirm) {
        console.log(chalk.yellow('⚠️  This will permanently delete the issue.'));
        console.log('Use --confirm flag to skip this warning.');
        return;
      }

      const spinner = ora('Deleting issue...').start();
      try {
        const issueEntity = new IssueEntity();
        await issueEntity.delete(id);
        spinner.succeed('Issue deleted successfully');
      } catch (error: any) {
        spinner.fail('Failed to delete issue');
        logger.error('Error', error);
      }
    });

  issue
    .command('comment <id> <message>')
    .description('Add a comment to an issue')
    .action(async (id, message) => {
      const spinner = ora('Adding comment...').start();
      try {
        const issueEntity = new IssueEntity();
        await issueEntity.addComment(id, message);
        spinner.succeed('Comment added successfully');
      } catch (error: any) {
        spinner.fail('Failed to add comment');
        logger.error('Error', error);
      }
    });

  issue
    .command('assign <id> <userId>')
    .description('Assign an issue to a user')
    .action(async (id, userId) => {
      const spinner = ora('Assigning issue...').start();
      try {
        const issueEntity = new IssueEntity();
        const issue = await issueEntity.assignToUser(id, userId);
        spinner.succeed(`Issue assigned: ${chalk.green(issue.identifier)}`);
      } catch (error: any) {
        spinner.fail('Failed to assign issue');
        logger.error('Error', error);
      }
    });

  issue
    .command('unassign <id>')
    .description('Unassign an issue')
    .action(async (id) => {
      const spinner = ora('Unassigning issue...').start();
      try {
        const issueEntity = new IssueEntity();
        const issue = await issueEntity.unassign(id);
        spinner.succeed(`Issue unassigned: ${chalk.green(issue.identifier)}`);
      } catch (error: any) {
        spinner.fail('Failed to unassign issue');
        logger.error('Error', error);
      }
    });
}
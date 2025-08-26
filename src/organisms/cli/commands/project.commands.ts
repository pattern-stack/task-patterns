/* eslint-disable no-console */
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { ProjectService } from '@features/project/service';
import { ProjectCreate } from '@features/project/schemas';
import { linearClient } from '@atoms/client/linear-client';
import { logger } from '@atoms/shared/logger';

export function projectCommands(program: Command) {
  const project = program.command('project').description('Manage Linear projects');

  project
    .command('create')
    .description('Create a new project')
    .requiredOption('-n, --name <name>', 'Project name')
    .requiredOption('--teams <teamIds>', 'Comma-separated team IDs')
    .option('-d, --description <description>', 'Project description')
    .option('--lead <leadId>', 'Project lead user ID')
    .option('--start <date>', 'Start date (YYYY-MM-DD)')
    .option('--target <date>', 'Target date (YYYY-MM-DD)')
    .option('-p, --priority <priority>', 'Priority (0-4)', (value) => parseInt(value))
    .action(async (options) => {
      const spinner = ora('Creating project...').start();
      try {
        const projectService = new ProjectService(linearClient.getClient());

        const data: ProjectCreate = {
          name: options.name,
          teamIds: options.teams.split(','),
          description: options.description,
          leadId: options.lead,
          startDate: options.start,
          targetDate: options.target,
          priority: options.priority,
        };

        const project = await projectService.create(data);
        spinner.succeed(`Project created: ${chalk.green(project.name)}`);
        console.log(chalk.gray(`ID: ${project.id}`));
        console.log(chalk.gray(`URL: ${project.url}`));
      } catch (error: unknown) {
        spinner.fail('Failed to create project');
        logger.error('Error', error);
      }
    });

  project
    .command('list')
    .description('List all projects')
    .option('--limit <limit>', 'Number of projects to fetch', (value) => parseInt(value), 20)
    .action(async (options) => {
      const spinner = ora('Fetching projects...').start();
      try {
        const projectService = new ProjectService(linearClient.getClient());
        const projects = await projectService.list({ first: options.limit });
        const nodes = await projects.nodes;

        spinner.succeed(`Found ${nodes.length} projects`);

        if (nodes.length > 0) {
          console.log('\nProjects:');
          for (const project of nodes) {
            const state = project.state ? chalk.blue(`[${project.state}]`) : '';
            const priority = project.priority ? `P${project.priority}` : '';
            console.log(`  ${chalk.green(project.name)} ${state} ${priority}`);
            if (project.description) {
              console.log(`    ${chalk.gray(project.description)}`);
            }
            if (project.targetDate) {
              console.log(`    Target: ${new Date(project.targetDate).toLocaleDateString()}`);
            }
            console.log(`    ID: ${project.id}`);
          }
        }
      } catch (error: unknown) {
        spinner.fail('Failed to fetch projects');
        logger.error('Error', error);
      }
    });

  project
    .command('get <id>')
    .description('Get project details')
    .action(async (id) => {
      const spinner = ora('Fetching project...').start();
      try {
        const projectService = new ProjectService(linearClient.getClient());
        const project = await projectService.get(id);

        if (project) {
          spinner.succeed(`Found project: ${chalk.green(project.name)}`);
          console.log('\nProject Details:');
          console.log(`  Name: ${project.name}`);
          console.log(`  Description: ${project.description || 'No description'}`);
          console.log(`  State: ${project.state || 'Unknown'}`);
          console.log(`  Priority: ${project.priority || 'None'}`);

          if (project.startDate) {
            console.log(`  Start Date: ${new Date(project.startDate).toLocaleDateString()}`);
          }
          if (project.targetDate) {
            console.log(`  Target Date: ${new Date(project.targetDate).toLocaleDateString()}`);
          }

          const lead = await project.lead;
          if (lead) {
            console.log(`  Lead: ${lead.name} (${lead.email})`);
          }

          console.log(`  ID: ${project.id}`);
          console.log(`  URL: ${project.url}`);
        } else {
          spinner.fail('Project not found');
        }
      } catch (error: unknown) {
        spinner.fail('Failed to fetch project');
        logger.error('Error', error);
      }
    });

  project
    .command('update <id>')
    .description('Update a project')
    .option('-n, --name <name>', 'Project name')
    .option('-d, --description <description>', 'Project description')
    .option('--lead <leadId>', 'Project lead user ID')
    .option('--start <date>', 'Start date (YYYY-MM-DD)')
    .option('--target <date>', 'Target date (YYYY-MM-DD)')
    .option('-p, --priority <priority>', 'Priority (0-4)', (value) => parseInt(value))
    .option('--state <state>', 'Project state (planned, started, paused, completed, canceled)')
    .action(async (id, options) => {
      const spinner = ora('Updating project...').start();
      try {
        const projectService = new ProjectService(linearClient.getClient());

        const data: Record<string, unknown> = {};
        if (options.name) {
          data.name = options.name;
        }
        if (options.description) {
          data.description = options.description;
        }
        if (options.lead) {
          data.leadId = options.lead;
        }
        if (options.start) {
          data.startDate = options.start;
        }
        if (options.target) {
          data.targetDate = options.target;
        }
        if (options.priority !== undefined) {
          data.priority = options.priority;
        }
        if (options.state) {
          data.state = options.state;
        }

        const project = await projectService.update(id, data);
        spinner.succeed(`Project updated: ${chalk.green(project.name)}`);
      } catch (error: unknown) {
        spinner.fail('Failed to update project');
        logger.error('Error', error);
      }
    });

  project
    .command('delete <id>')
    .description('Delete a project')
    .option('--confirm', 'Skip confirmation')
    .action(async (id, options) => {
      if (!options.confirm) {
        console.log(chalk.yellow('⚠️  This will permanently delete the project.'));
        console.log('Use --confirm flag to skip this warning.');
        return;
      }

      const spinner = ora('Deleting project...').start();
      try {
        const projectService = new ProjectService(linearClient.getClient());
        await projectService.delete(id);
        spinner.succeed('Project deleted successfully');
      } catch (error: unknown) {
        spinner.fail('Failed to delete project');
        logger.error('Error', error);
      }
    });

  project
    .command('issues <projectId>')
    .description('List project issues')
    .option('--limit <limit>', 'Number of issues to fetch', (value) => parseInt(value), 20)
    .action(async (projectId, options) => {
      const spinner = ora('Fetching project issues...').start();
      try {
        const projectService = new ProjectService(linearClient.getClient());
        const issues = await projectService.getIssues(projectId, { first: options.limit });
        const nodes = await issues.nodes;

        spinner.succeed(`Found ${nodes.length} issues`);

        if (nodes.length > 0) {
          console.log('\nProject Issues:');
          for (const issue of nodes) {
            const priority = issue.priority ? `P${issue.priority}` : 'None';
            const assigneeObj = issue.assignee ? await issue.assignee : null;
            const assignee = assigneeObj?.name || 'Unassigned';
            const stateObj = issue.state ? await issue.state : null;
            console.log(`  ${chalk.green(issue.identifier)} - ${issue.title}`);
            console.log(
              `    Priority: ${priority} | Assignee: ${assignee} | State: ${stateObj?.name || 'Unknown'}`,
            );
          }
        }
      } catch (error: unknown) {
        spinner.fail('Failed to fetch project issues');
        logger.error('Error', error);
      }
    });

  project
    .command('milestones <projectId>')
    .description('List project milestones')
    .option('--limit <limit>', 'Number of milestones to fetch', (value) => parseInt(value), 20)
    .action(async (projectId, options) => {
      const spinner = ora('Fetching project milestones...').start();
      try {
        const projectService = new ProjectService(linearClient.getClient());
        const milestones = await projectService.getMilestones(projectId, { first: options.limit });
        const nodes = await milestones.nodes;

        spinner.succeed(`Found ${nodes.length} milestones`);

        if (nodes.length > 0) {
          console.log('\nProject Milestones:');
          for (const milestone of nodes) {
            console.log(`  ${chalk.green(milestone.name)}`);
            if (milestone.description) {
              console.log(`    ${chalk.gray(milestone.description)}`);
            }
            if (milestone.targetDate) {
              console.log(`    Target: ${new Date(milestone.targetDate).toLocaleDateString()}`);
            }
            console.log(`    ID: ${milestone.id}`);
          }
        }
      } catch (error: unknown) {
        spinner.fail('Failed to fetch project milestones');
        logger.error('Error', error);
      }
    });

  project
    .command('teams <projectId>')
    .description('List project teams')
    .action(async (projectId) => {
      const spinner = ora('Fetching project teams...').start();
      try {
        const projectService = new ProjectService(linearClient.getClient());
        const teams = await projectService.getTeams(projectId);
        const nodes = await teams.nodes;

        spinner.succeed(`Found ${nodes.length} teams`);

        if (nodes.length > 0) {
          console.log('\nProject Teams:');
          for (const team of nodes) {
            console.log(`  ${chalk.green(team.key)} - ${team.name}`);
            if (team.description) {
              console.log(`    ${chalk.gray(team.description)}`);
            }
          }
        }
      } catch (error: unknown) {
        spinner.fail('Failed to fetch project teams');
        logger.error('Error', error);
      }
    });
}

#!/usr/bin/env node

import { Command } from 'commander';
import ora from 'ora';
import { issueCommands } from './commands/issue.commands';
import { issueManagerCommands } from './commands/issue-manager.commands';
import { teamCommands } from './commands/team.commands';
import { projectCommands } from './commands/project.commands';
import { userCommands } from './commands/user.commands';
import { labelCommands } from './commands/label.commands';
import { cycleCommands } from './commands/cycle.commands';
import { linearClient } from '@atoms/client/linear-client';
import { logger } from '@atoms/shared/logger';

const program = new Command();

program
  .name('linear-agent')
  .description('CLI for Linear GraphQL API with atomic architecture')
  .version('1.0.0');

program
  .command('test-connection')
  .description('Test connection to Linear API')
  .action(async () => {
    const spinner = ora('Testing Linear API connection...').start();
    try {
      const connected = await linearClient.testConnection();
      if (connected) {
        spinner.succeed('Connected to Linear API');
      } else {
        spinner.fail('Failed to connect to Linear API');
      }
    } catch (error) {
      spinner.fail('Connection test failed');
      logger.error('Connection error', error);
    }
  });

// Enhanced issue management commands (primary tool)
issueManagerCommands(program);

// Core commands
issueCommands(program);
teamCommands(program);
projectCommands(program);
userCommands(program);
labelCommands(program);
cycleCommands(program);

program.parseAsync(process.argv).catch((error) => {
  logger.error('CLI error', error);
  process.exit(1);
});

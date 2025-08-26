/* eslint-disable no-console */
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { UserService } from '@features/user/service';
import { linearClient } from '@atoms/client/linear-client';
import { logger } from '@atoms/shared/logger';

export function userCommands(program: Command) {
  const user = program.command('user').description('Manage Linear users');

  user
    .command('list')
    .description('List all users')
    .option('--limit <limit>', 'Number of users to fetch', (value) => parseInt(value), 50)
    .action(async (options) => {
      const spinner = ora('Fetching users...').start();
      try {
        const userService = new UserService(linearClient.getClient());
        const users = await userService.list(undefined, { first: options.limit });
        const nodes = await users.nodes;

        spinner.succeed(`Found ${nodes.length} users`);

        if (nodes.length > 0) {
          console.log('\nUsers:');
          for (const user of nodes) {
            const admin = user.admin ? chalk.yellow(' (Admin)') : '';
            console.log(`  ${chalk.cyan(user.email)}${admin}`);
            console.log(`    Name: ${user.name}`);
            console.log(`    ID: ${user.id}`);
          }
        }
      } catch (error: unknown) {
        spinner.fail('Failed to fetch users');
        logger.error('Error', error);
      }
    });

  user
    .command('get <email>')
    .description('Get user details by email')
    .action(async (email) => {
      const spinner = ora('Fetching user...').start();
      try {
        const userService = new UserService(linearClient.getClient());

        // Search for user by email
        const users = await userService.list(undefined, { first: 100 });
        const nodes = await users.nodes;
        const user = nodes.find((u) => u.email === email);

        if (user) {
          spinner.succeed(`Found user: ${chalk.green(user.email)}`);
          console.log('\nUser Details:');
          console.log(`  Name: ${user.name}`);
          console.log(`  Email: ${user.email}`);
          console.log(`  ID: ${user.id}`);
          console.log(`  Admin: ${user.admin ? 'Yes' : 'No'}`);
          console.log(`  Active: ${user.active ? 'Yes' : 'No'}`);
          console.log(
            `  Created: ${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}`,
          );

          // Get user's teams
          const teams = await user.teams();
          const teamNodes = await teams.nodes;
          if (teamNodes.length > 0) {
            console.log(`  Teams: ${teamNodes.map((t) => t.name).join(', ')}`);
          }
        } else {
          spinner.fail(`User not found: ${email}`);
        }
      } catch (error: unknown) {
        spinner.fail('Failed to fetch user');
        logger.error('Error', error);
      }
    });

  user
    .command('me')
    .description('Get current user details')
    .action(async () => {
      const spinner = ora('Fetching current user...').start();
      try {
        const userService = new UserService(linearClient.getClient());
        const user = await userService.getMe();

        if (user) {
          spinner.succeed(`Logged in as: ${chalk.green(user.email)}`);
          console.log('\nUser Details:');
          console.log(`  Name: ${user.name}`);
          console.log(`  Email: ${user.email}`);
          console.log(`  ID: ${user.id}`);
          console.log(`  Admin: ${user.admin ? 'Yes' : 'No'}`);

          // Get user's teams
          const teams = await user.teams();
          const teamNodes = await teams.nodes;
          if (teamNodes.length > 0) {
            console.log(`  Teams: ${teamNodes.map((t: any) => `${t.key} (${t.name})`).join(', ')}`);
          }
        } else {
          spinner.fail('Could not fetch current user');
        }
      } catch (error: unknown) {
        spinner.fail('Failed to fetch current user');
        logger.error('Error', error);
      }
    });

  user
    .command('teams <email>')
    .description('List teams for a user')
    .action(async (email) => {
      const spinner = ora('Fetching user teams...').start();
      try {
        const userService = new UserService(linearClient.getClient());

        // Search for user by email
        const users = await userService.list(undefined, { first: 100 });
        const nodes = await users.nodes;
        const user = nodes.find((u) => u.email === email);

        if (user) {
          const teams = await user.teams();
          const teamNodes = await teams.nodes;

          spinner.succeed(`Found ${teamNodes.length} teams for ${email}`);

          if (teamNodes.length > 0) {
            console.log('\nTeams:');
            for (const team of teamNodes) {
              console.log(`  ${chalk.cyan(team.key)} - ${team.name}`);
              console.log(`    ID: ${team.id}`);
            }
          }
        } else {
          spinner.fail(`User not found: ${email}`);
        }
      } catch (error: unknown) {
        spinner.fail('Failed to fetch user teams');
        logger.error('Error', error);
      }
    });
}

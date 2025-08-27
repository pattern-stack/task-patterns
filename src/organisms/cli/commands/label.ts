import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as readline from 'readline';
import { linearClient } from '@atoms/client/linear-client';
import { LabelAPI, LABEL_TEMPLATES } from '@molecules/apis/label.api';
import { formatters } from '../formatters';

/**
 * Label Command Module
 * 
 * Provides label management capabilities via CLI
 */

export function createLabelCommand(): Command {
  const labels = new Command('labels')
    .alias('l')
    .description('Manage labels');

  // List labels
  labels
    .command('list')
    .alias('ls')
    .description('List all labels')
    .option('--hierarchy', 'Show labels in hierarchical view')
    .option('--team <key>', 'Filter by team')
    .action(async (options) => {
      const spinner = ora('Fetching labels...').start();
      
      try {
        const client = linearClient.getClient();
        const api = new LabelAPI(client);
        
        let labels;
        if (options.team) {
          labels = await api.listByTeam(options.team);
        } else {
          labels = await api.list();
        }
        
        spinner.stop();
        formatters.labelList(labels, options.hierarchy);
        
      } catch (error) {
        spinner.fail('Could not fetch labels');
        formatters.error('Failed to fetch labels', error);
      }
    });

  // Create a label
  labels
    .command('create <name>')
    .description('Create a new label (use category:value for hierarchical labels)')
    .option('-c, --color <color>', 'Hex color (e.g., #ff0000)')
    .option('-d, --description <desc>', 'Label description')
    .option('-t, --team <key>', 'Team key (creates team-specific label)')
    .action(async (name, options) => {
      const spinner = ora(`Creating label "${name}"...`).start();
      
      try {
        const client = linearClient.getClient();
        const api = new LabelAPI(client);
        
        // Check if label already exists
        const existing = await api.getByName(name);
        if (existing) {
          spinner.fail(`Label "${name}" already exists`);
          return;
        }
        
        const label = await api.create({
          name,
          color: options.color,
          description: options.description,
          team: options.team
        });
        
        spinner.succeed('Label created successfully');
        formatters.label(label);
        
      } catch (error) {
        spinner.fail('Could not create label');
        formatters.error('Failed to create label', error);
      }
    });

  // Apply label template
  labels
    .command('apply-template <template>')
    .description('Apply a label template')
    .option('-t, --team <key>', 'Apply to specific team')
    .option('--skip-existing', 'Skip labels that already exist')
    .action(async (templateName, options) => {
      const spinner = ora(`Applying template "${templateName}"...`).start();
      
      try {
        const client = linearClient.getClient();
        const api = new LabelAPI(client);
        
        const result = await api.applyTemplate(templateName, options.team, options.skipExisting);
        
        spinner.stop();
        
        if (result.created.length > 0) {
          formatters.success(`Created ${result.created.length} labels`);
          result.created.forEach((label: any) => {
            console.log(chalk.green('  ✓'), label.name);
          });
        }
        
        if (result.errors.length > 0) {
          formatters.warning(`Failed to create ${result.errors.length} labels`);
          result.errors.forEach(({ label, error }: any) => {
            console.log(chalk.red('  ✗'), label, chalk.dim(`- ${error}`));
          });
        }
        
        formatters.info(`Template "${templateName}" applied`);
        
      } catch (error) {
        spinner.fail('Could not apply template');
        formatters.error('Failed to apply template', error);
      }
    });

  // List available templates
  labels
    .command('templates')
    .description('List available label templates')
    .action(() => {
      const templates = LabelAPI.getAvailableTemplates();
      
      console.log(chalk.cyan('\n==> Label Templates\n'));
      
      templates.forEach(({ name, template }) => {
        console.log(chalk.yellow(`  ${name}`));
        console.log(chalk.gray('    Description:'), template.description);
        
        template.labels.forEach(category => {
          console.log(chalk.gray(`    ${category.category}:`), 
            category.values.map(v => v.name).join(', ')
          );
        });
        console.log();
      });
      
      console.log(chalk.dim('  Usage: tp labels apply-template <template>'));
    });

  // Bulk create labels
  labels
    .command('bulk-create')
    .description('Create multiple labels from input')
    .option('-t, --team <key>', 'Team key for all labels')
    .option('--from-file <file>', 'Read labels from file (one per line)')
    .action(async (options) => {
      const labelSpecs: Array<{ name: string; color?: string; description?: string }> = [];
      
      if (options.fromFile) {
        // Read from file
        const fs = await import('fs');
        const path = await import('path');
        
        try {
          const content = fs.readFileSync(path.resolve(options.fromFile), 'utf-8');
          const lines = content.split('\n').filter(line => line.trim());
          
          lines.forEach(line => {
            // Parse format: name,color,description
            const [name, color, description] = line.split(',').map(s => s.trim());
            if (name) {
              labelSpecs.push({ name, color, description });
            }
          });
        } catch (error) {
          formatters.error('Could not read file', error);
          return;
        }
      } else {
        // Interactive input
        console.log(chalk.cyan('Enter labels (one per line, empty line to finish):'));
        console.log(chalk.dim('Format: name[,color][,description]'));
        console.log(chalk.dim('Example: type:bug,#ff0000,Defects and issues'));
        
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const readLabels = async (): Promise<void> => {
          return new Promise((resolve) => {
            const handleLine = (line: string) => {
              if (!line.trim()) {
                rl.close();
                resolve();
                return;
              }
              
              const [name, color, description] = line.split(',').map(s => s.trim());
              if (name) {
                labelSpecs.push({ name, color, description });
              }
              
              rl.question('', handleLine);
            };
            
            rl.question('', handleLine);
          });
        };
        
        await readLabels();
      }
      
      if (labelSpecs.length === 0) {
        formatters.warning('No labels to create');
        return;
      }
      
      const spinner = ora(`Creating ${labelSpecs.length} labels...`).start();
      
      try {
        const client = linearClient.getClient();
        const api = new LabelAPI(client);
        
        const result = await api.bulkCreate(
          labelSpecs.map(spec => ({
            ...spec,
            team: options.team
          }))
        );
        
        spinner.stop();
        
        if (result.succeeded.length > 0) {
          formatters.success(`Created ${result.succeeded.length} labels`);
          result.succeeded.forEach((label: any) => {
            console.log(chalk.green('  ✓'), label.name);
          });
        }
        
        if (result.failed.length > 0) {
          formatters.warning(`Failed to create ${result.failed.length} labels`);
          result.failed.forEach(({ item, error }: any) => {
            console.log(chalk.red('  ✗'), (item as any).name, chalk.dim(`- ${error}`));
          });
        }
        
      } catch (error) {
        spinner.fail('Could not create labels');
        formatters.error('Failed to create labels', error);
      }
    });

  // Search labels
  labels
    .command('search <query>')
    .description('Search labels by name')
    .option('--team <key>', 'Search within specific team')
    .action(async (query, options) => {
      const spinner = ora(`Searching for "${query}"...`).start();
      
      try {
        const client = linearClient.getClient();
        const api = new LabelAPI(client);
        
        // Search is not available in LabelAPI, using list and filter
        let allLabels = options.team 
          ? await api.listByTeam(options.team)
          : await api.list();
        
        const lowerQuery = query.toLowerCase();
        const labels = allLabels.filter(label => 
          label.name.toLowerCase().includes(lowerQuery)
        );
        
        spinner.stop();
        
        if (labels.length === 0) {
          formatters.warning(`No labels found matching "${query}"`);
        } else {
          formatters.labelList(labels);
        }
        
      } catch (error) {
        spinner.fail('Search failed');
        formatters.error('Failed to search labels', error);
      }
    });

  // Update label
  labels
    .command('update <name>')
    .description('Update a label')
    .option('-n, --new-name <name>', 'New label name')
    .option('-c, --color <color>', 'New hex color')
    .option('-d, --description <desc>', 'New description')
    .action(async (name, options) => {
      if (!options.newName && !options.color && !options.description) {
        formatters.warning('No updates specified');
        console.log(chalk.dim('  Use --help to see available options'));
        return;
      }
      
      const spinner = ora(`Updating label "${name}"...`).start();
      
      try {
        const client = linearClient.getClient();
        const api = new LabelAPI(client);
        
        const label = await api.getByName(name);
        if (!label) {
          spinner.fail(`Label "${name}" not found`);
          return;
        }
        
        const updates: any = {};
        if (options.newName) updates.name = options.newName;
        if (options.color) updates.color = options.color;
        if (options.description) updates.description = options.description;
        
        const updated = await api.update(label.id, updates);
        
        spinner.succeed('Label updated successfully');
        formatters.label(updated);
        
      } catch (error) {
        spinner.fail('Could not update label');
        formatters.error('Failed to update label', error);
      }
    });

  // Delete label
  labels
    .command('delete <name>')
    .alias('rm')
    .description('Delete a label')
    .option('--confirm', 'Skip confirmation prompt')
    .action(async (name, options) => {
      const spinner = ora(`Deleting label "${name}"...`).start();
      
      try {
        const client = linearClient.getClient();
        const api = new LabelAPI(client);
        
        const label = await api.getByName(name);
        if (!label) {
          spinner.fail(`Label "${name}" not found`);
          return;
        }
        
        spinner.stop();
        
        if (!options.confirm) {
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
          });
          
          const confirmed = await new Promise<boolean>((resolve) => {
            rl.question(chalk.yellow(`Are you sure you want to delete "${name}"? (y/N) `), (answer) => {
              rl.close();
              resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
            });
          });
          
          if (!confirmed) {
            console.log(chalk.gray('Deletion cancelled'));
            return;
          }
        }
        
        spinner.start();
        await api.delete(label.id);
        
        spinner.succeed(`Label "${name}" deleted`);
        
      } catch (error) {
        spinner.fail('Could not delete label');
        formatters.error('Failed to delete label', error);
      }
    });

  // Get label hierarchy
  labels
    .command('hierarchy')
    .description('Show label hierarchy visualization')
    .option('--team <key>', 'Show hierarchy for specific team')
    .action(async (options) => {
      const spinner = ora('Building label hierarchy...').start();
      
      try {
        const client = linearClient.getClient();
        const api = new LabelAPI(client);
        
        let allLabels;
        if (options.team) {
          allLabels = await api.listByTeam(options.team);
        } else {
          allLabels = await api.list();
        }
        
        // Build hierarchy manually
        const categories = new Map<string, any[]>();
        
        allLabels.forEach(label => {
          if (label.name.includes(':')) {
            const [category, value] = label.name.split(':', 2);
            if (!categories.has(category)) {
              categories.set(category, []);
            }
            categories.get(category)!.push({
              value,
              name: label.name,
              color: label.color,
              issueCount: 0
            });
          }
        });
        
        const hierarchy = Array.from(categories.entries()).map(([category, labels]) => ({
          category,
          labels
        }));
        
        spinner.stop();
        
        console.log(chalk.cyan('\n==> Label Hierarchy\n'));
        
        hierarchy.forEach((category: any) => {
          console.log(chalk.yellow(`  ${category.category}:`));
          
          category.labels.forEach((label: any) => {
            console.log(
              '    ',
              chalk.white(label.value),
              label.color ? chalk.hex(label.color)('●') : '',
              chalk.dim(`(${label.issueCount} issues)`)
            );
          });
          
          console.log();
        });
        
      } catch (error) {
        spinner.fail('Could not build hierarchy');
        formatters.error('Failed to build hierarchy', error);
      }
    });

  return labels;
}
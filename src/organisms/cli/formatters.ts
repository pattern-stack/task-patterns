import chalk from 'chalk';
import type { Team, IssueLabel, User, Cycle } from '@linear/sdk';
import type { TeamAnalytics } from '@molecules/apis/team.api';

/**
 * CLI Output Formatters
 * 
 * Reusable formatting functions for consistent CLI output
 */

export const formatters = {
  /**
   * Format team display
   */
  team(team: Team, detailed = false): void {
    console.log(chalk.cyan(`\n==> ${team.key}: ${team.name}\n`));
    
    console.log(chalk.gray('  Key:           '), chalk.yellow(team.key));
    console.log(chalk.gray('  Name:          '), team.name);
    if (team.description) {
      console.log(chalk.gray('  Description:   '), team.description);
    }
    
    if (detailed) {
      console.log(chalk.gray('  Cycles:        '), team.cyclesEnabled ? 'Enabled' : 'Disabled');
      if (team.cyclesEnabled) {
        console.log(chalk.gray('  Cycle Duration:'), `${team.cycleDuration} days`);
        console.log(chalk.gray('  Start Day:     '), `Day ${team.cycleStartDay}`);
      }
      console.log(chalk.gray('  Triage:        '), team.triageEnabled ? 'Enabled' : 'Disabled');
      console.log(chalk.gray('  ID:            '), chalk.dim(team.id));
    }
  },

  /**
   * Format team list as table
   */
  teamList(teams: Team[]): void {
    console.log(chalk.cyan('\n==> Teams\n'));
    
    if (teams.length === 0) {
      console.log(chalk.yellow('  No teams found'));
      return;
    }
    
    teams.forEach(team => {
      console.log(chalk.yellow(`  ${team.key.padEnd(6)}`), team.name);
      if (team.description) {
        console.log(chalk.dim(`         ${team.description}`));
      }
    });
    
    console.log(chalk.dim(`\n  ${teams.length} team${teams.length !== 1 ? 's' : ''} total`));
  },

  /**
   * Format label with hierarchy
   */
  label(label: IssueLabel, indent = 0): void {
    const prefix = '  '.repeat(indent);
    const [category, value] = label.name.includes(':') 
      ? label.name.split(':', 2)
      : ['', label.name];
    
    if (category) {
      console.log(
        prefix,
        chalk.gray(`${category}:`),
        chalk.white(value),
        label.color ? chalk.hex(label.color)('●') : ''
      );
    } else {
      console.log(
        prefix,
        chalk.white(label.name),
        label.color ? chalk.hex(label.color)('●') : ''
      );
    }
    
    if (label.description) {
      console.log(chalk.dim(`${prefix}  ${label.description}`));
    }
  },

  /**
   * Format label list with optional hierarchy
   */
  labelList(labels: IssueLabel[], hierarchy = false): void {
    console.log(chalk.cyan('\n==> Labels\n'));
    
    if (labels.length === 0) {
      console.log(chalk.yellow('  No labels found'));
      return;
    }
    
    if (hierarchy) {
      // Group labels by category
      const categories = new Map<string, IssueLabel[]>();
      const uncategorized: IssueLabel[] = [];
      
      labels.forEach(label => {
        if (label.name.includes(':')) {
          const [category] = label.name.split(':', 2);
          if (!categories.has(category)) {
            categories.set(category, []);
          }
          categories.get(category)!.push(label);
        } else {
          uncategorized.push(label);
        }
      });
      
      // Display categorized labels
      categories.forEach((categoryLabels, category) => {
        console.log(chalk.yellow(`  ${category}:`));
        categoryLabels.forEach(label => {
          const value = label.name.split(':', 2)[1];
          console.log(
            '    ',
            chalk.white(value),
            label.color ? chalk.hex(label.color)('●') : ''
          );
          if (label.description) {
            console.log(chalk.dim(`      ${label.description}`));
          }
        });
        console.log();
      });
      
      // Display uncategorized labels
      if (uncategorized.length > 0) {
        console.log(chalk.yellow('  Other:'));
        uncategorized.forEach(label => {
          console.log(
            '    ',
            chalk.white(label.name),
            label.color ? chalk.hex(label.color)('●') : ''
          );
        });
      }
    } else {
      // Simple list
      labels.forEach(label => formatters.label(label, 1));
    }
    
    console.log(chalk.dim(`\n  ${labels.length} label${labels.length !== 1 ? 's' : ''} total`));
  },

  /**
   * Format team analytics
   */
  analytics(analytics: TeamAnalytics): void {
    console.log(chalk.cyan(`\n==> Team Analytics: ${analytics.teamKey}\n`));
    
    // Metrics
    console.log(chalk.yellow('  Metrics:'));
    console.log(chalk.gray('    Total Issues:     '), analytics.metrics.totalIssues);
    console.log(chalk.gray('    Open:             '), chalk.yellow(analytics.metrics.openIssues.toString()));
    console.log(chalk.gray('    In Progress:      '), chalk.blue(analytics.metrics.inProgressIssues.toString()));
    console.log(chalk.gray('    Completed:        '), chalk.green(analytics.metrics.completedIssues.toString()));
    
    // Member stats
    if (analytics.memberStats.length > 0) {
      console.log(chalk.yellow('\n  Member Performance:'));
      analytics.memberStats
        .sort((a, b) => b.completedIssues - a.completedIssues)
        .slice(0, 5)
        .forEach(member => {
          const bar = '█'.repeat(Math.min(20, member.completedIssues));
          console.log(
            chalk.gray('   '),
            member.name.padEnd(20),
            chalk.green(bar),
            chalk.dim(`${member.completedIssues} completed`)
          );
        });
    }
    
    // Label distribution
    if (analytics.labelDistribution.size > 0) {
      console.log(chalk.yellow('\n  Label Distribution:'));
      const sorted = Array.from(analytics.labelDistribution.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      sorted.forEach(([label, count]) => {
        const bar = '▪'.repeat(Math.min(20, count));
        console.log(chalk.gray('   '), label.padEnd(20), chalk.cyan(bar), chalk.dim(count.toString()));
      });
    }
    
    // Priority distribution
    if (analytics.priorityDistribution.size > 0) {
      console.log(chalk.yellow('\n  Priority Distribution:'));
      const priorityNames = ['None', 'Low', 'Medium', 'High', 'Urgent'];
      analytics.priorityDistribution.forEach((count, priority) => {
        const bar = '▪'.repeat(Math.min(20, count));
        console.log(
          chalk.gray('   '),
          priorityNames[priority].padEnd(10),
          chalk.yellow(bar),
          chalk.dim(count.toString())
        );
      });
    }
  },

  /**
   * Format members list
   */
  memberList(members: User[]): void {
    console.log(chalk.yellow('\n  Members:'));
    
    if (members.length === 0) {
      console.log(chalk.dim('    No members'));
      return;
    }
    
    members.forEach(member => {
      console.log(chalk.gray('   '), member.name || member.email);
    });
    
    console.log(chalk.dim(`\n  ${members.length} member${members.length !== 1 ? 's' : ''} total`));
  },

  /**
   * Format cycles list
   */
  cycleList(cycles: Cycle[], current?: Cycle | null): void {
    console.log(chalk.yellow('\n  Cycles:'));
    
    if (cycles.length === 0) {
      console.log(chalk.dim('    No cycles'));
      return;
    }
    
    cycles.forEach(cycle => {
      const isCurrent = current && cycle.id === current.id;
      const status = isCurrent ? chalk.green(' [CURRENT]') : '';
      console.log(
        chalk.gray('   '),
        cycle.name || cycle.number,
        status,
        chalk.dim(`(${new Date(cycle.startsAt).toLocaleDateString()} - ${new Date(cycle.endsAt).toLocaleDateString()})`)
      );
    });
  },

  /**
   * Format success message
   */
  success(message: string, details?: string): void {
    console.log(chalk.green(`✓ ${message}`));
    if (details) {
      console.log(chalk.dim(`  ${details}`));
    }
  },

  /**
   * Format error message
   */
  error(message: string, error?: any): void {
    console.log(chalk.red(`✗ ${message}`));
    if (error) {
      console.log(chalk.dim(`  ${error.message || error}`));
    }
  },

  /**
   * Format warning message
   */
  warning(message: string): void {
    console.log(chalk.yellow(`⚠ ${message}`));
  },

  /**
   * Format info message
   */
  info(message: string): void {
    console.log(chalk.cyan(`ℹ ${message}`));
  },

  /**
   * Format velocity chart
   */
  velocity(velocities: number[], cycleLabels?: string[]): void {
    console.log(chalk.yellow('\n  Velocity (Issues per Cycle):'));
    
    if (velocities.length === 0) {
      console.log(chalk.dim('    No velocity data'));
      return;
    }
    
    const max = Math.max(...velocities);
    velocities.forEach((v, i) => {
      const barLength = max > 0 ? Math.round((v / max) * 20) : 0;
      const bar = '█'.repeat(barLength);
      const label = cycleLabels?.[i] || `Cycle ${i + 1}`;
      console.log(
        chalk.gray('   '),
        label.padEnd(10),
        chalk.blue(bar),
        chalk.dim(v.toString())
      );
    });
    
    const avg = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    console.log(chalk.dim(`\n    Average: ${avg.toFixed(1)} issues/cycle`));
  },

  /**
   * Format template list
   */
  templateList(templates: Array<{ name: string; description: string }>): void {
    console.log(chalk.cyan('\n==> Available Templates\n'));
    
    templates.forEach(template => {
      console.log(chalk.yellow(`  ${template.name}`));
      console.log(chalk.dim(`    ${template.description}`));
    });
  }
};
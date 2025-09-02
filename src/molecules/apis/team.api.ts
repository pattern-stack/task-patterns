import type { LinearClient } from '@linear/sdk';
import { Team, User, Project, Cycle, WorkflowState, IssueLabel } from '@linear/sdk';
import { TeamService } from '@features/team/service';
import { UserService } from '@features/user/service';
import { ProjectService } from '@features/project/service';
import { CycleService } from '@features/cycle/service';
import { WorkflowStateService } from '@features/workflow-state/service';
import { LabelService } from '@features/label/service';
import { IssueService } from '@features/issue/service';
import { TeamCreate, TeamUpdate } from '@features/team/schemas';
import { logger } from '@atoms/shared/logger';
import { BatchOperationResult, Pagination } from '@atoms/types/common';

/**
 * Team template definitions for common team setups
 */
export interface TeamTemplate {
  name: string;
  description: string;
  config: {
    key: string;
    name: string;
    description?: string;
    cyclesEnabled?: boolean;
    cycleDuration?: number;
    cycleStartDay?: number;
    triageEnabled?: boolean;
    defaultWorkflowStates?: Array<{
      name: string;
      type: 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled';
      color?: string;
    }>;
    defaultLabels?: Array<{
      name: string;
      color?: string;
      description?: string;
    }>;
  };
}

/**
 * Predefined team templates
 */
export const TEAM_TEMPLATES: Record<string, TeamTemplate> = {
  engineering: {
    name: 'Engineering Team',
    description: 'Standard engineering team with sprints',
    config: {
      key: 'ENG',
      name: 'Engineering',
      description: 'Product engineering team',
      cyclesEnabled: true,
      cycleDuration: 14,
      cycleStartDay: 1,
      triageEnabled: true,
      defaultWorkflowStates: [
        { name: 'Backlog', type: 'backlog', color: '#6b7280' },
        { name: 'Ready', type: 'unstarted', color: '#3b82f6' },
        { name: 'In Progress', type: 'started', color: '#f59e0b' },
        { name: 'In Review', type: 'started', color: '#8b5cf6' },
        { name: 'Done', type: 'completed', color: '#16a34a' },
        { name: 'Canceled', type: 'canceled', color: '#dc2626' },
      ],
      defaultLabels: [
        { name: 'bug', color: '#dc2626', description: 'Something is broken' },
        { name: 'feature', color: '#16a34a', description: 'New functionality' },
        {
          name: 'improvement',
          color: '#3b82f6',
          description: 'Enhancement to existing functionality',
        },
      ],
    },
  },
  support: {
    name: 'Support Team',
    description: 'Customer support team with triage',
    config: {
      key: 'SUP',
      name: 'Support',
      description: 'Customer support team',
      cyclesEnabled: false,
      triageEnabled: true,
      defaultWorkflowStates: [
        { name: 'Triage', type: 'backlog', color: '#f59e0b' },
        { name: 'Investigating', type: 'started', color: '#8b5cf6' },
        { name: 'Waiting on Customer', type: 'started', color: '#6b7280' },
        { name: 'Resolved', type: 'completed', color: '#16a34a' },
        { name: 'Closed', type: 'canceled', color: '#6b7280' },
      ],
      defaultLabels: [
        { name: 'critical', color: '#dc2626', description: 'Urgent customer issue' },
        { name: 'question', color: '#3b82f6', description: 'Customer question' },
        { name: 'feedback', color: '#8b5cf6', description: 'Customer feedback' },
      ],
    },
  },
};

/**
 * Team analytics data structure
 */
export interface TeamAnalytics {
  teamId: string;
  teamKey: string;
  teamName: string;
  metrics: {
    totalIssues: number;
    openIssues: number;
    completedIssues: number;
    inProgressIssues: number;
    averageCycleTime?: number;
    velocity?: number;
  };
  memberStats: Array<{
    userId: string;
    name: string;
    assignedIssues: number;
    completedIssues: number;
  }>;
  labelDistribution: Map<string, number>;
  priorityDistribution: Map<number, number>;
}

/**
 * TeamAPI - High-level API facade for team management
 *
 * Features:
 * - Team CRUD operations
 * - Member management
 * - Team resource access (projects, cycles, states, labels)
 * - Bulk operations
 * - Template-based setup
 * - Team analytics
 */
export class TeamAPI {
  private teamService: TeamService;
  private userService: UserService;
  private projectService: ProjectService;
  private cycleService: CycleService;
  private workflowStateService: WorkflowStateService;
  private labelService: LabelService;
  private issueService: IssueService;

  constructor(private client: LinearClient) {
    this.teamService = new TeamService(client);
    this.userService = new UserService(client);
    this.projectService = new ProjectService(client);
    this.cycleService = new CycleService(client);
    this.workflowStateService = new WorkflowStateService(client);
    this.labelService = new LabelService(client);
    this.issueService = new IssueService(client);
  }

  // ==================== CRUD Operations ====================

  /**
   * Create a new team
   */
  async create(data: TeamCreate): Promise<Team> {
    return this.teamService.create(data);
  }

  /**
   * Get a team by ID
   */
  async get(id: string): Promise<Team | null> {
    return this.teamService.get(id);
  }

  /**
   * Get a team by key (e.g., "ENG")
   */
  async getByKey(key: string): Promise<Team | null> {
    return this.teamService.getByKey(key);
  }

  /**
   * Resolve team identifier to ID
   */
  async resolveTeamId(keyOrId: string): Promise<string | null> {
    return this.teamService.resolveTeamId(keyOrId);
  }

  /**
   * Update a team
   */
  async update(id: string, data: TeamUpdate): Promise<Team> {
    return this.teamService.update(id, data);
  }

  /**
   * Delete a team
   */
  async delete(id: string): Promise<boolean> {
    return this.teamService.delete(id);
  }

  /**
   * List all teams
   */
  async list(options?: { first?: number }): Promise<Team[]> {
    const pagination = options ? { first: options.first || 50 } : undefined;
    const result = await this.teamService.list(pagination);
    return result.nodes;
  }

  // ==================== Member Operations ====================

  /**
   * Get team members
   */
  async getMembers(teamKey: string): Promise<User[]> {
    const teamId = await this.resolveTeamId(teamKey);
    if (!teamId) {
      throw new Error(`Team not found: ${teamKey}`);
    }

    const result = await this.teamService.getMembers(teamId);
    return result.nodes;
  }

  /**
   * Add member to team
   */
  async addMember(teamKey: string, userEmail: string): Promise<boolean> {
    const teamId = await this.resolveTeamId(teamKey);
    if (!teamId) {
      throw new Error(`Team not found: ${teamKey}`);
    }

    const user = await this.userService.getByEmail(userEmail);
    if (!user) {
      throw new Error(`User not found: ${userEmail}`);
    }

    // Note: Linear API doesn't directly support adding members to teams
    // This would typically be done through organization-level operations
    logger.warn('Adding members to teams requires organization admin permissions');
    throw new Error('Team member management requires organization admin API access');
  }

  /**
   * Remove member from team
   */
  async removeMember(teamKey: string, userEmail: string): Promise<boolean> {
    const teamId = await this.resolveTeamId(teamKey);
    if (!teamId) {
      throw new Error(`Team not found: ${teamKey}`);
    }

    const user = await this.userService.getByEmail(userEmail);
    if (!user) {
      throw new Error(`User not found: ${userEmail}`);
    }

    // Note: Linear API doesn't directly support removing members from teams
    logger.warn('Removing members from teams requires organization admin permissions');
    throw new Error('Team member management requires organization admin API access');
  }

  // ==================== Resource Operations ====================

  /**
   * Get team projects
   */
  async getProjects(teamKey: string): Promise<Project[]> {
    const teamId = await this.resolveTeamId(teamKey);
    if (!teamId) {
      throw new Error(`Team not found: ${teamKey}`);
    }

    const result = await this.teamService.getProjects(teamId);
    return result.nodes;
  }

  /**
   * Get team cycles
   */
  async getCycles(teamKey: string, options?: { includePast?: boolean }): Promise<Cycle[]> {
    const teamId = await this.resolveTeamId(teamKey);
    if (!teamId) {
      throw new Error(`Team not found: ${teamKey}`);
    }

    const result = await this.teamService.getCycles(teamId);
    const cycles = result.nodes;

    if (!options?.includePast) {
      const now = new Date();
      return cycles.filter((cycle) => new Date(cycle.endsAt) >= now);
    }

    return cycles;
  }

  /**
   * Get current cycle for team
   */
  async getCurrentCycle(teamKey: string): Promise<Cycle | null> {
    const cycles = await this.getCycles(teamKey);
    const now = new Date();

    return (
      cycles.find((cycle) => {
        const start = new Date(cycle.startsAt);
        const end = new Date(cycle.endsAt);
        return start <= now && end >= now;
      }) || null
    );
  }

  /**
   * Get team workflow states
   */
  async getWorkflowStates(teamKey: string): Promise<WorkflowState[]> {
    const teamId = await this.resolveTeamId(teamKey);
    if (!teamId) {
      throw new Error(`Team not found: ${teamKey}`);
    }

    const result = await this.teamService.getWorkflowStates(teamId);
    return result.nodes;
  }

  /**
   * Get team labels
   */
  async getLabels(teamKey: string): Promise<IssueLabel[]> {
    const teamId = await this.resolveTeamId(teamKey);
    if (!teamId) {
      throw new Error(`Team not found: ${teamKey}`);
    }

    const result = await this.teamService.getLabels(teamId);
    return result.nodes;
  }

  /**
   * Get team issues
   */
  async getIssues(
    teamKey: string,
    options?: {
      includeCompleted?: boolean;
      first?: number;
    },
  ): Promise<any[]> {
    const teamId = await this.resolveTeamId(teamKey);
    if (!teamId) {
      throw new Error(`Team not found: ${teamKey}`);
    }

    const filter: any = { teamId };

    if (!options?.includeCompleted) {
      filter.state = { type: { neq: 'completed' } };
    }

    const result = await this.issueService.list(filter, { first: options?.first || 100 });
    return result.nodes;
  }

  // ==================== Analytics Operations ====================

  /**
   * Get team analytics
   */
  async getAnalytics(teamKey: string): Promise<TeamAnalytics> {
    const teamId = await this.resolveTeamId(teamKey);
    if (!teamId) {
      throw new Error(`Team not found: ${teamKey}`);
    }

    const team = await this.teamService.get(teamId);
    if (!team) {
      throw new Error(`Team not found: ${teamKey}`);
    }

    logger.info(`Gathering analytics for team ${teamKey}`);

    // Get all issues for the team
    const issues = await this.getIssues(teamKey, { includeCompleted: true, first: 1000 });

    // Get team members
    const members = await this.getMembers(teamKey);

    // Calculate metrics
    const openIssues = issues.filter(
      (i) => i.state?.type !== 'completed' && i.state?.type !== 'canceled',
    );
    const completedIssues = issues.filter((i) => i.state?.type === 'completed');
    const inProgressIssues = issues.filter((i) => i.state?.type === 'started');

    // Member statistics
    const memberStats = await Promise.all(
      members.map(async (member) => {
        const memberIssues = issues.filter((i) => i.assignee?.id === member.id);
        const memberCompleted = memberIssues.filter((i) => i.state?.type === 'completed');

        return {
          userId: member.id,
          name: member.name || member.email,
          assignedIssues: memberIssues.length,
          completedIssues: memberCompleted.length,
        };
      }),
    );

    // Label distribution
    const labelDistribution = new Map<string, number>();
    issues.forEach((issue) => {
      if (issue.labels?.nodes) {
        issue.labels.nodes.forEach((label: any) => {
          const count = labelDistribution.get(label.name) || 0;
          labelDistribution.set(label.name, count + 1);
        });
      }
    });

    // Priority distribution
    const priorityDistribution = new Map<number, number>();
    issues.forEach((issue) => {
      const priority = issue.priority || 0;
      const count = priorityDistribution.get(priority) || 0;
      priorityDistribution.set(priority, count + 1);
    });

    return {
      teamId,
      teamKey,
      teamName: team.name,
      metrics: {
        totalIssues: issues.length,
        openIssues: openIssues.length,
        completedIssues: completedIssues.length,
        inProgressIssues: inProgressIssues.length,
      },
      memberStats,
      labelDistribution,
      priorityDistribution,
    };
  }

  /**
   * Get team velocity (issues completed per cycle)
   */
  async getVelocity(teamKey: string, cycleCount: number = 3): Promise<number[]> {
    const teamId = await this.resolveTeamId(teamKey);
    if (!teamId) {
      throw new Error(`Team not found: ${teamKey}`);
    }

    const cycles = await this.getCycles(teamKey, { includePast: true });
    const recentCycles = cycles.slice(0, cycleCount);

    const velocities = await Promise.all(
      recentCycles.map(async (cycle) => {
        const issues = await cycle.issues({ filter: { state: { type: { eq: 'completed' } } } });
        return issues.nodes.length;
      }),
    );

    return velocities;
  }

  // ==================== Template Operations ====================

  /**
   * Apply a team template
   */
  async applyTemplate(templateName: string, overrides?: Partial<TeamCreate>): Promise<Team> {
    const template = TEAM_TEMPLATES[templateName];
    if (!template) {
      throw new Error(
        `Template '${templateName}' not found. Available: ${Object.keys(TEAM_TEMPLATES).join(', ')}`,
      );
    }

    logger.info(`Applying template '${templateName}'`);

    const teamData: TeamCreate = {
      ...template.config,
      ...overrides,
    };

    // Create the team
    const team = await this.create(teamData);
    logger.success(`Team created: ${team.key}`);

    // Note: Default workflow states are typically created automatically by Linear
    // Labels would need to be created separately using LabelAPI

    if (template.config.defaultLabels && template.config.defaultLabels.length > 0) {
      logger.info('Note: Use LabelAPI to create default labels for this team');
    }

    return team;
  }

  /**
   * Get available templates
   */
  static getAvailableTemplates(): Array<{ name: string; template: TeamTemplate }> {
    return Object.entries(TEAM_TEMPLATES).map(([name, template]) => ({
      name,
      template,
    }));
  }

  // ==================== Bulk Operations ====================

  /**
   * Create multiple teams at once
   */
  async bulkCreate(teams: TeamCreate[]): Promise<BatchOperationResult<Team>> {
    const results = await Promise.allSettled(teams.map((team) => this.create(team)));

    const successful: Team[] = [];
    const failed: Array<{ item: TeamCreate; error: string }> = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(result.value);
      } else {
        failed.push({
          item: teams[index],
          error: result.reason?.message || 'Unknown error',
        });
      }
    });

    return {
      success: successful.length > 0,
      succeeded: successful,
      failed,
      totalCount: teams.length,
      successCount: successful.length,
      failureCount: failed.length,
    };
  }

  /**
   * Update multiple teams at once
   */
  async bulkUpdate(
    updates: Array<{ id: string; data: TeamUpdate }>,
  ): Promise<BatchOperationResult<Team>> {
    const results = await Promise.allSettled(updates.map(({ id, data }) => this.update(id, data)));

    const successful: Team[] = [];
    const failed: Array<{ item: any; error: string }> = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(result.value);
      } else {
        failed.push({
          item: updates[index],
          error: result.reason?.message || 'Unknown error',
        });
      }
    });

    return {
      success: successful.length > 0,
      succeeded: successful,
      failed,
      totalCount: updates.length,
      successCount: successful.length,
      failureCount: failed.length,
    };
  }

  // ==================== Utility Operations ====================

  /**
   * Clone a team's configuration
   */
  async cloneTeam(sourceTeamKey: string, newTeamData: TeamCreate): Promise<Team> {
    const sourceTeam = await this.getByKey(sourceTeamKey);
    if (!sourceTeam) {
      throw new Error(`Source team not found: ${sourceTeamKey}`);
    }

    logger.info(`Cloning team ${sourceTeamKey} to create ${newTeamData.key}`);

    // Create new team with cloned settings
    const clonedTeam = await this.create({
      ...newTeamData,
      cyclesEnabled: sourceTeam.cyclesEnabled,
      cycleStartDay: sourceTeam.cycleStartDay,
      cycleDuration: sourceTeam.cycleDuration,
      triageEnabled: sourceTeam.triageEnabled,
    });

    // Note: Workflow states are typically created automatically
    // Labels would need to be cloned separately using LabelAPI

    logger.success(`Team cloned: ${clonedTeam.key}`);
    return clonedTeam;
  }

  /**
   * Validate team key format
   */
  static validateTeamKey(key: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!key || key.trim().length === 0) {
      errors.push('Team key cannot be empty');
    }

    if (key.length > 5) {
      errors.push('Team key cannot exceed 5 characters');
    }

    if (!/^[A-Z0-9]+$/.test(key)) {
      errors.push('Team key must contain only uppercase letters and numbers');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Search teams by name or key
   */
  async search(query: string): Promise<Team[]> {
    const teams = await this.list({ first: 100 });
    const lowerQuery = query.toLowerCase();

    return teams.filter(
      (team) =>
        team.name.toLowerCase().includes(lowerQuery) || team.key.toLowerCase().includes(lowerQuery),
    );
  }
}

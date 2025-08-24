import { IssueEntity } from '../entities/issue.entity';
import { TeamService } from '@features/team/service';
import { ProjectService } from '@features/project/service';
import { logger } from '@atoms/shared/logger';
import { NotFoundError } from '@atoms/types/common';

export interface SprintPlanningOptions {
  teamId: string;
  cycleId: string;
  issueIds: string[];
  projectId?: string;
}

export interface SprintPlanningResult {
  success: boolean;
  movedIssues: string[];
  failedIssues: Array<{ issueId: string; error: string }>;
  summary: {
    totalIssues: number;
    successCount: number;
    failureCount: number;
    totalEstimate?: number;
  };
}

export class SprintPlanningWorkflow {
  private issueEntity: IssueEntity;
  private teamService: TeamService;
  private projectService: ProjectService;

  constructor() {
    this.issueEntity = new IssueEntity();
    this.teamService = new TeamService();
    this.projectService = new ProjectService();
  }

  async planSprint(options: SprintPlanningOptions): Promise<SprintPlanningResult> {
    logger.info('Starting sprint planning workflow', options);

    const team = await this.teamService.get(options.teamId);
    if (!team) {
      throw new NotFoundError('Team', options.teamId);
    }

    const cycles = await this.teamService.getCycles(options.teamId);
    const cycle = cycles.nodes.find(c => c.id === options.cycleId);
    if (!cycle) {
      throw new NotFoundError('Cycle', options.cycleId);
    }

    if (options.projectId) {
      const project = await this.projectService.get(options.projectId);
      if (!project) {
        throw new NotFoundError('Project', options.projectId);
      }
    }

    const result: SprintPlanningResult = {
      success: false,
      movedIssues: [],
      failedIssues: [],
      summary: {
        totalIssues: options.issueIds.length,
        successCount: 0,
        failureCount: 0,
        totalEstimate: 0,
      },
    };

    for (const issueId of options.issueIds) {
      try {
        const issue = await this.issueEntity.get(issueId);
        if (!issue) {
          result.failedIssues.push({
            issueId,
            error: 'Issue not found',
          });
          result.summary.failureCount++;
          continue;
        }

        const updateData: any = { cycleId: options.cycleId };
        if (options.projectId) {
          updateData.projectId = options.projectId;
        }

        await this.issueEntity.update(issueId, updateData);
        
        result.movedIssues.push(issueId);
        result.summary.successCount++;
        
        if (issue.estimate) {
          result.summary.totalEstimate! += issue.estimate;
        }

        logger.success(`Issue ${issue.identifier} added to sprint`);
      } catch (error: any) {
        result.failedIssues.push({
          issueId,
          error: error.message || 'Unknown error',
        });
        result.summary.failureCount++;
        logger.error(`Failed to add issue ${issueId} to sprint`, error);
      }
    }

    result.success = result.summary.failureCount === 0;

    logger.info('Sprint planning completed', result.summary);

    return result;
  }

  async calculateSprintCapacity(teamId: string, cycleId: string) {
    const team = await this.teamService.get(teamId);
    if (!team) {
      throw new NotFoundError('Team', teamId);
    }

    const issues = await this.issueEntity.list({
      teamId,
      cycleId,
      state: 'unstarted',
      includeArchived: false,
    });

    const capacity = {
      totalIssues: issues.issues.length,
      totalEstimate: 0,
      byPriority: {
        urgent: 0,
        high: 0,
        medium: 0,
        low: 0,
        none: 0,
      },
      byAssignee: new Map<string, number>(),
    };

    for (const issue of issues.issues) {
      if (issue.estimate) {
        capacity.totalEstimate += issue.estimate;
      }

      const priority = issue.priority || 0;
      if (priority === 4) capacity.byPriority.urgent++;
      else if (priority === 3) capacity.byPriority.high++;
      else if (priority === 2) capacity.byPriority.medium++;
      else if (priority === 1) capacity.byPriority.low++;
      else capacity.byPriority.none++;

      if (issue.assignee) {
        const assignee = await issue.assignee;
        if (assignee) {
          const assigneeId = assignee.id;
          const current = capacity.byAssignee.get(assigneeId) || 0;
          capacity.byAssignee.set(assigneeId, current + (issue.estimate || 0));
        }
      }
    }

    return capacity;
  }

  async autoAssignIssues(teamId: string, issueIds: string[]) {
    const team = await this.teamService.get(teamId);
    if (!team) {
      throw new NotFoundError('Team', teamId);
    }

    const members = await this.teamService.getMembers(teamId);
    const memberNodes = await members.nodes;
    
    if (memberNodes.length === 0) {
      throw new Error('Team has no members');
    }

    const workload = new Map<string, number>();
    memberNodes.forEach(member => workload.set(member.id, 0));

    const existingIssues = await this.issueEntity.list({
      teamId,
      state: 'unstarted',
      includeArchived: false,
    });

    for (const issue of existingIssues.issues) {
      if (issue.assignee) {
        const assignee = await issue.assignee;
        if (assignee && workload.has(assignee.id)) {
          const current = workload.get(assignee.id) || 0;
          workload.set(assignee.id, current + (issue.estimate || 1));
        }
      }
    }

    const results = [];

    for (const issueId of issueIds) {
      try {
        const issue = await this.issueEntity.get(issueId);
        if (!issue) {
          results.push({ issueId, success: false, error: 'Issue not found' });
          continue;
        }

        const [assigneeId] = [...workload.entries()]
          .sort((a, b) => a[1] - b[1])[0];

        await this.issueEntity.assignToUser(issueId, assigneeId);

        const current = workload.get(assigneeId) || 0;
        workload.set(assigneeId, current + (issue.estimate || 1));

        results.push({ issueId, success: true, assigneeId });
        logger.success(`Issue ${issue.identifier} assigned`);
      } catch (error: any) {
        results.push({ issueId, success: false, error: error.message });
      }
    }

    return results;
  }
}
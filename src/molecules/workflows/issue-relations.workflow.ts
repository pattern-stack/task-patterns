import { LinearClient, Issue as LinearIssue, User, Project, Team } from '@linear/sdk';
import { IssueService } from '@features/issue/service';
import { TeamService } from '@features/team/service';
import { ProjectService } from '@features/project/service';
import { UserService } from '@features/user/service';
import { LabelService } from '@features/label/service';
import { WorkflowStateService } from '@features/workflow-state/service';
import { IssueCreate } from '@features/issue/schemas';
import { logger } from '@atoms/shared/logger';
import { NotFoundError } from '@atoms/types/common';

export interface QuickCreateOptions {
  description?: string;
  assignee?: string;
  labels?: string[];
  priority?: number;
  dueDate?: Date;
  project?: string;
  parent?: string;
}

export interface IssueCreationResult {
  issue: LinearIssue;
  url: string;
  identifier: string;
  warnings?: string[];
}

/**
 * Workflow for handling cross-entity issue operations
 * This workflow orchestrates operations that involve multiple entities
 */
export class IssueRelationsWorkflow {
  private issueService: IssueService;
  private teamService: TeamService;
  private projectService: ProjectService;
  private userService: UserService;
  private labelService: LabelService;
  private workflowStateService: WorkflowStateService;

  constructor(private client: LinearClient) {
    this.issueService = new IssueService(client);
    this.teamService = new TeamService(client);
    this.projectService = new ProjectService(client);
    this.userService = new UserService(client);
    this.labelService = new LabelService(client);
    this.workflowStateService = new WorkflowStateService(client);
  }

  /**
   * Create an issue with validation of related entities
   */
  async createWithValidation(data: IssueCreate): Promise<LinearIssue> {
    logger.info(`Creating issue with validation: ${data.title}`);

    // Validate team exists
    const team = await this.teamService.get(data.teamId);
    if (!team) {
      throw new NotFoundError('Team', data.teamId);
    }

    // Validate project exists if provided
    if (data.projectId) {
      const project = await this.projectService.get(data.projectId);
      if (!project) {
        throw new NotFoundError('Project', data.projectId);
      }
    }

    // Validate assignee exists if provided
    if (data.assigneeId) {
      const user = await this.userService.get(data.assigneeId);
      if (!user) {
        throw new NotFoundError('User', data.assigneeId);
      }
    }

    // Validate labels exist if provided
    if (data.labelIds && data.labelIds.length > 0) {
      const labelValidations = await Promise.all(
        data.labelIds.map(async (labelId) => {
          const label = await this.labelService.get(labelId);
          return { labelId, exists: !!label };
        })
      );
      
      const missingLabels = labelValidations.filter(v => !v.exists);
      if (missingLabels.length > 0) {
        logger.warn(`Some labels not found: ${missingLabels.map(l => l.labelId).join(', ')}`);
      }
    }

    return await this.issueService.create(data);
  }

  /**
   * Move an issue to a different project
   */
  async moveToProject(issueId: string, projectId: string): Promise<LinearIssue> {
    logger.info(`Moving issue ${issueId} to project ${projectId}`);
    
    const [issue, project] = await Promise.all([
      this.issueService.get(issueId),
      this.projectService.get(projectId),
    ]);

    if (!issue) {
      throw new NotFoundError('Issue', issueId);
    }
    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    return await this.issueService.update(issueId, { projectId });
  }

  /**
   * Assign an issue to a user
   */
  async assignToUser(issueId: string, userId: string): Promise<LinearIssue> {
    logger.info(`Assigning issue ${issueId} to user ${userId}`);
    
    const [issue, user] = await Promise.all([
      this.issueService.get(issueId),
      this.userService.get(userId),
    ]);

    if (!issue) {
      throw new NotFoundError('Issue', issueId);
    }
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    return await this.issueService.update(issueId, { assigneeId: userId });
  }

  /**
   * Unassign an issue
   */
  async unassign(issueId: string): Promise<LinearIssue> {
    logger.info(`Unassigning issue ${issueId}`);
    
    const issue = await this.issueService.get(issueId);
    if (!issue) {
      throw new NotFoundError('Issue', issueId);
    }

    return await this.issueService.update(issueId, { assigneeId: null });
  }

  /**
   * Move an issue to a different workflow state
   */
  async moveToState(issueId: string, stateId: string): Promise<LinearIssue> {
    logger.info(`Moving issue ${issueId} to state ${stateId}`);
    
    const [issue, state] = await Promise.all([
      this.issueService.get(issueId),
      this.workflowStateService.get(stateId),
    ]);

    if (!issue) {
      throw new NotFoundError('Issue', issueId);
    }
    if (!state) {
      throw new NotFoundError('WorkflowState', stateId);
    }

    return await this.issueService.update(issueId, { stateId });
  }

  /**
   * Quick issue creation with smart defaults and resolution
   */
  async quickCreate(
    title: string,
    teamKey: string,
    options?: QuickCreateOptions,
  ): Promise<IssueCreationResult> {
    logger.info(`Quick creating issue: ${title} for team ${teamKey}`);
    const warnings: string[] = [];

    // Resolve team by key
    const team = await this.teamService.getByKey(teamKey);
    if (!team) {
      throw new NotFoundError('Team', teamKey);
    }

    // Build issue creation data
    const issueData: IssueCreate = {
      title,
      teamId: team.id,
      description: options?.description,
      priority: options?.priority,
      dueDate: options?.dueDate?.toISOString(),
    };

    // Resolve assignee if provided
    if (options?.assignee) {
      const user = await this.userService.getByEmail(options.assignee);
      if (user) {
        issueData.assigneeId = user.id;
      } else {
        warnings.push(`Could not find user: ${options.assignee}`);
      }
    }

    // Resolve project if provided
    if (options?.project) {
      const project = await this.projectService.get(options.project);
      if (project) {
        issueData.projectId = project.id;
      } else {
        warnings.push(`Could not find project: ${options.project}`);
      }
    }

    // Resolve labels if provided
    if (options?.labels && options.labels.length > 0) {
      const labelIds: string[] = [];
      for (const labelName of options.labels) {
        const label = await this.labelService.getByName(labelName, team.id);
        if (label) {
          labelIds.push(label.id);
        } else {
          warnings.push(`Could not find label: ${labelName}`);
        }
      }
      if (labelIds.length > 0) {
        issueData.labelIds = labelIds;
      }
    }

    // Resolve parent issue if provided
    if (options?.parent) {
      const parent = await this.issueService.getByIdentifier(options.parent);
      if (parent) {
        issueData.parentId = parent.id;
      } else {
        warnings.push(`Could not find parent issue: ${options.parent}`);
      }
    }

    const issue = await this.issueService.create(issueData);

    return {
      issue,
      url: issue.url,
      identifier: issue.identifier,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Create a sub-issue with proper parent validation
   */
  async createSubIssue(parentId: string, data: IssueCreate): Promise<LinearIssue> {
    logger.info(`Creating sub-issue for parent ${parentId}`);
    
    const parent = await this.issueService.get(parentId);
    if (!parent) {
      throw new NotFoundError('Parent issue', parentId);
    }

    // Use parent's team if not specified
    let teamId = data.teamId;
    if (!teamId && parent.team) {
      const parentTeam = await parent.team;
      teamId = parentTeam.id;
    }

    const subIssueData: IssueCreate = {
      ...data,
      parentId,
      teamId: teamId,
    };

    return await this.createWithValidation(subIssueData);
  }

  /**
   * Change issue priority with validation
   */
  async changePriority(issueId: string, priority: number): Promise<LinearIssue> {
    if (priority < 0 || priority > 4) {
      throw new Error('Priority must be between 0 and 4');
    }

    const issue = await this.issueService.get(issueId);
    if (!issue) {
      throw new NotFoundError('Issue', issueId);
    }

    return await this.issueService.update(issueId, { priority });
  }
}
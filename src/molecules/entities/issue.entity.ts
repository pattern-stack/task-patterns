import {
  Issue as LinearIssue,
  Comment,
  Attachment,
  User,
  Team,
  Project,
  IssueLabel,
} from '@linear/sdk';
import { IssueService } from '@features/issue/service';
import { TeamService } from '@features/team/service';
import { ProjectService } from '@features/project/service';
import { CommentService } from '@features/comment/service';
import { UserService } from '@features/user/service';
import { LabelService } from '@features/label/service';
import { WorkflowStateService } from '@features/workflow-state/service';
import { IssueCreate, IssueUpdate, IssueFilter, IssueBulkUpdate } from '@features/issue/schemas';
import { CommentCreate } from '@features/comment/schemas';
import { logger } from '@atoms/shared/logger';
import { NotFoundError, Pagination } from '@atoms/types/common';
import { IssueIdentifierParser } from '@atoms/parsers/issue-identifier.parser';

export interface IssueWithRelations {
  issue: LinearIssue;
  team?: Team;
  project?: Project;
  assignee?: User;
  comments?: Comment[];
  attachments?: Attachment[];
  labels?: IssueLabel[];
}

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

export class IssueEntity {
  private issueService: IssueService;
  private teamService: TeamService;
  private projectService: ProjectService;
  private commentService: CommentService;
  private userService: UserService;
  private labelService: LabelService;
  private workflowStateService: WorkflowStateService;

  constructor() {
    this.issueService = new IssueService();
    this.teamService = new TeamService();
    this.projectService = new ProjectService();
    this.commentService = new CommentService();
    this.userService = new UserService();
    this.labelService = new LabelService();
    this.workflowStateService = new WorkflowStateService();
  }

  async create(data: IssueCreate): Promise<LinearIssue> {
    logger.info(`Creating issue: ${data.title}`);

    const team = await this.teamService.get(data.teamId);
    if (!team) {
      throw new NotFoundError('Team', data.teamId);
    }

    if (data.projectId) {
      const project = await this.projectService.get(data.projectId);
      if (!project) {
        throw new NotFoundError('Project', data.projectId);
      }
    }

    return await this.issueService.create(data);
  }

  async get(id: string): Promise<LinearIssue | null> {
    return await this.issueService.get(id);
  }

  async getByIdentifier(identifier: string): Promise<LinearIssue | null> {
    return await this.issueService.getByIdentifier(identifier);
  }

  async getWithRelations(id: string): Promise<IssueWithRelations | null> {
    const issue = await this.issueService.get(id);
    if (!issue) {
      return null;
    }

    const [team, assignee, comments, attachments, labels] = await Promise.all([
      issue.team,
      issue.assignee,
      issue.comments(),
      issue.attachments(),
      issue.labels(),
    ]);

    let project: Project | undefined = undefined;
    if (issue.project) {
      project = await issue.project;
    }

    return {
      issue,
      team,
      project,
      assignee,
      comments: comments.nodes,
      attachments: attachments.nodes,
      labels: labels.nodes,
    };
  }

  async update(id: string, data: IssueUpdate): Promise<LinearIssue> {
    logger.info(`Updating issue: ${id}`);

    if (data.projectId) {
      const project = await this.projectService.get(data.projectId);
      if (!project) {
        throw new NotFoundError('Project', data.projectId);
      }
    }

    return await this.issueService.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    logger.info(`Deleting issue: ${id}`);
    return await this.issueService.delete(id);
  }

  async archive(id: string): Promise<boolean> {
    logger.info(`Archiving issue: ${id}`);
    return await this.issueService.archive(id);
  }

  async list(filter?: IssueFilter, pagination?: Pagination) {
    const connection = await this.issueService.list(filter, pagination);
    const nodes = await connection.nodes;
    const pageInfo = await connection.pageInfo;

    return {
      issues: nodes,
      pageInfo,
      totalCount: nodes.length,
    };
  }

  async bulkUpdate(data: IssueBulkUpdate) {
    logger.info(`Bulk updating ${data.issueIds.length} issues`);
    return await this.issueService.bulkUpdate(data);
  }

  async moveToProject(issueId: string, projectId: string): Promise<LinearIssue> {
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

  async assignToUser(issueId: string, userId: string): Promise<LinearIssue> {
    const issue = await this.issueService.get(issueId);
    if (!issue) {
      throw new NotFoundError('Issue', issueId);
    }

    return await this.issueService.update(issueId, { assigneeId: userId });
  }

  async unassign(issueId: string): Promise<LinearIssue> {
    const issue = await this.issueService.get(issueId);
    if (!issue) {
      throw new NotFoundError('Issue', issueId);
    }

    return await this.issueService.update(issueId, { assigneeId: null });
  }

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

  async addComment(issueId: string, body: string): Promise<boolean> {
    const issue = await this.issueService.get(issueId);
    if (!issue) {
      throw new NotFoundError('Issue', issueId);
    }

    return await this.issueService.addComment(issueId, body);
  }

  async addLabels(issueId: string, labelIds: string[]): Promise<LinearIssue> {
    return await this.issueService.addLabels(issueId, labelIds);
  }

  async removeLabels(issueId: string, labelIds: string[]): Promise<LinearIssue> {
    return await this.issueService.removeLabels(issueId, labelIds);
  }

  async getSubIssues(issueId: string) {
    const issue = await this.issueService.get(issueId);
    if (!issue) {
      throw new NotFoundError('Issue', issueId);
    }

    const children = await issue.children();
    return children.nodes;
  }

  async createSubIssue(parentId: string, data: IssueCreate): Promise<LinearIssue> {
    const parent = await this.issueService.get(parentId);
    if (!parent) {
      throw new NotFoundError('Parent issue', parentId);
    }

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

    return await this.issueService.create(subIssueData);
  }

  /**
   * Quick issue creation with smart defaults and resolution
   */
  async quickCreate(
    title: string,
    teamKey: string,
    options?: QuickCreateOptions,
  ): Promise<IssueCreationResult> {
    try {
      logger.info(`Quick creating issue: ${title} for team ${teamKey}`);
      const warnings: string[] = [];

      // Resolve team by key
      const team = await this.resolveTeamByKey(teamKey);
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
        const user = await this.resolveUserByEmail(options.assignee);
        if (user) {
          issueData.assigneeId = user.id;
        } else {
          warnings.push(`Could not find user: ${options.assignee}`);
        }
      }

      // Resolve labels if provided
      if (options?.labels && options.labels.length > 0) {
        const labelIds: string[] = [];
        for (const labelName of options.labels) {
          const label = await this.labelService.getByName(labelName);
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

      // Resolve project if provided
      if (options?.project) {
        const projects = await this.projectService.list({ first: 100 });
        const projectNodes = await projects.nodes;
        const project = projectNodes.find(
          (p) => p.name.toLowerCase() === options.project!.toLowerCase(),
        );
        if (project) {
          issueData.projectId = project.id;
        } else {
          warnings.push(`Could not find project: ${options.project}`);
        }
      }

      // Resolve parent issue if provided
      if (options?.parent) {
        const parentIssue = await this.resolveIdentifier(options.parent);
        if (parentIssue) {
          issueData.parentId = parentIssue.id;
        } else {
          warnings.push(`Could not find parent issue: ${options.parent}`);
        }
      }

      // Create the issue
      const issue = await this.issueService.create(issueData);

      return {
        issue,
        url: issue.url,
        identifier: issue.identifier,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      logger.error('Failed to quick create issue', error);
      throw error;
    }
  }

  /**
   * Move an issue to a new status
   */
  async moveToStatus(issueId: string, statusName: string): Promise<LinearIssue> {
    try {
      logger.info(`Moving issue ${issueId} to status: ${statusName}`);

      const issue = await this.issueService.get(issueId);
      if (!issue) {
        throw new NotFoundError('Issue', issueId);
      }

      const team = await issue.team;
      if (!team) {
        throw new Error('Issue has no team associated');
      }

      const state = await this.workflowStateService.getByTeamAndName(team.id, statusName);
      if (!state) {
        throw new NotFoundError(`Status "${statusName}"`, `team ${team.key}`);
      }

      return await this.issueService.update(issueId, { stateId: state.id });
    } catch (error) {
      logger.error('Failed to move issue to status', error);
      throw error;
    }
  }

  /**
   * Add a comment to an issue
   */
  async addCommentToIssue(issueId: string, body: string): Promise<Comment> {
    try {
      logger.info(`Adding comment to issue: ${issueId}`);

      const issue = await this.issueService.get(issueId);
      if (!issue) {
        throw new NotFoundError('Issue', issueId);
      }

      const commentData: CommentCreate = {
        issueId: issue.id,
        body,
      };

      return await this.commentService.create(commentData);
    } catch (error) {
      logger.error('Failed to add comment', error);
      throw error;
    }
  }

  /**
   * Resolve an issue identifier (ENG-123, #123, UUID) to an Issue
   */
  async resolveIdentifier(identifier: string): Promise<LinearIssue | null> {
    try {
      const parsed = IssueIdentifierParser.parse(identifier);
      if (!parsed) {
        // Try as-is in case it's a valid identifier we didn't parse
        return await this.issueService.getByIdentifier(identifier);
      }

      switch (parsed.type) {
        case 'uuid':
          return await this.issueService.get(parsed.uuid!);
        case 'team-number': {
          // Use the properly formatted identifier
          const fullIdentifier = `${parsed.teamKey}-${parsed.number}`;
          return await this.issueService.getByIdentifier(fullIdentifier);
        }
        case 'number-only':
          // For number-only, we can't reliably resolve without team context
          logger.warn(`Cannot resolve issue #${parsed.number} without team context`);
          return null;
        default:
          return null;
      }
    } catch (error) {
      logger.debug(`Failed to resolve identifier: ${identifier}`, error);
      return null;
    }
  }

  /**
   * Resolve multiple identifiers in parallel
   */
  async resolveIdentifiers(identifiers: string[]): Promise<Map<string, LinearIssue | null>> {
    const results = new Map<string, LinearIssue | null>();
    const promises = identifiers.map(async (id) => {
      const issue = await this.resolveIdentifier(id);
      results.set(id, issue);
    });
    await Promise.all(promises);
    return results;
  }

  /**
   * Resolve team by key (e.g., "eng" or "ENG")
   */
  private async resolveTeamByKey(teamKey: string): Promise<{ id: string; key: string } | null> {
    try {
      const team = await this.teamService.getByKey(teamKey.toUpperCase());
      if (team) {
        return { id: team.id, key: team.key };
      }
      // Try as ID if not found by key
      const teamById = await this.teamService.get(teamKey);
      if (teamById) {
        return { id: teamById.id, key: teamById.key };
      }
      return null;
    } catch (error) {
      logger.debug(`Failed to resolve team: ${teamKey}`, error);
      return null;
    }
  }

  /**
   * Resolve user by email or username
   */
  private async resolveUserByEmail(
    emailOrUsername: string,
  ): Promise<{ id: string; name?: string; displayName?: string } | null> {
    try {
      // Try as email first
      const user = await this.userService.getByEmail(emailOrUsername);
      if (user) {
        return user;
      }
      // TODO: Try as username
      // TODO: Try as ID
      return null;
    } catch (error) {
      logger.debug(`Failed to resolve user: ${emailOrUsername}`, error);
      return null;
    }
  }
}

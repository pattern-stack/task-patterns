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
import { IssueCreate, IssueUpdate, IssueFilter, IssueBulkUpdate } from '@features/issue/schemas';
import { logger } from '@atoms/shared/logger';
import { NotFoundError, Pagination } from '@atoms/types/common';

export interface IssueWithRelations {
  issue: LinearIssue;
  team?: Team;
  project?: Project;
  assignee?: User;
  comments?: Comment[];
  attachments?: Attachment[];
  labels?: IssueLabel[];
}

export class IssueEntity {
  private issueService: IssueService;
  private teamService: TeamService;
  private projectService: ProjectService;

  constructor() {
    this.issueService = new IssueService();
    this.teamService = new TeamService();
    this.projectService = new ProjectService();
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
}

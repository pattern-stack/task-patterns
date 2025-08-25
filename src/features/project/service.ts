import { Project, ProjectConnection, LinearDocument } from '@linear/sdk';

type ProjectCreateInput = LinearDocument.ProjectCreateInput;
type ProjectUpdateInput = LinearDocument.ProjectUpdateInput;

import { linearClient } from '@atoms/client/linear-client';
import { logger } from '@atoms/shared/logger';
import { NotFoundError, ValidationError } from '@atoms/types/common';
import {
  ProjectCreate,
  ProjectUpdate,
  ProjectCreateSchema,
  ProjectUpdateSchema,
  Pagination,
} from './schemas';

export class ProjectService {
  private client = linearClient.getClient();

  async create(data: ProjectCreate): Promise<Project> {
    try {
      // Validate input data
      const validatedData = ProjectCreateSchema.parse(data);

      logger.debug('Creating project', validatedData);

      const input: ProjectCreateInput = {
        name: validatedData.name,
        description: validatedData.description,
        teamIds: validatedData.teamIds,
        leadId: validatedData.leadId,
        memberIds: validatedData.memberIds,
        targetDate: validatedData.targetDate,
        startDate: validatedData.startDate,
        priority: validatedData.priority,
      };

      const payload = await this.client.createProject(input);

      if (!payload.success || !payload.project) {
        throw new ValidationError('Failed to create project');
      }

      const project = await payload.project;
      logger.success(`Project created: ${project.name}`);

      return project;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'name' in error &&
        (error as any).name === 'ZodError'
      ) {
        throw new ValidationError(`Validation failed: ${(error as any).message}`);
      }
      logger.error('Failed to create project', error);
      throw error;
    }
  }

  async get(id: string): Promise<Project | null> {
    try {
      logger.debug(`Fetching project: ${id}`);
      const project = await this.client.project(id);
      return project;
    } catch (error) {
      logger.debug(`Project not found: ${id}`);
      return null;
    }
  }

  async update(id: string, data: ProjectUpdate): Promise<Project> {
    try {
      // Validate input data
      const validatedData = ProjectUpdateSchema.parse(data);

      logger.debug(`Updating project: ${id}`, validatedData);

      const project = await this.get(id);
      if (!project) {
        throw new NotFoundError('Project', id);
      }

      const input: ProjectUpdateInput = {
        name: validatedData.name,
        description: validatedData.description,
        leadId: validatedData.leadId,
        memberIds: validatedData.memberIds,
        targetDate: validatedData.targetDate,
        startDate: validatedData.startDate,
        priority: validatedData.priority,
        state: validatedData.state,
      };

      const payload = await this.client.updateProject(id, input);

      if (!payload.success || !payload.project) {
        throw new ValidationError('Failed to update project');
      }

      const updatedProject = await payload.project;
      logger.success(`Project updated: ${updatedProject.name}`);

      return updatedProject;
    } catch (error: unknown) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      if (
        error &&
        typeof error === 'object' &&
        'name' in error &&
        (error as any).name === 'ZodError'
      ) {
        throw new ValidationError(`Validation failed: ${(error as any).message}`);
      }
      logger.error(`Failed to update project ${id}`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      logger.debug(`Deleting project: ${id}`);

      const project = await this.get(id);
      if (!project) {
        throw new NotFoundError('Project', id);
      }

      const payload = await this.client.deleteProject(id);

      if (!payload.success) {
        throw new ValidationError('Failed to delete project');
      }

      logger.success(`Project deleted: ${id}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete project ${id}`, error);
      throw error;
    }
  }

  async list(pagination?: Pagination): Promise<ProjectConnection> {
    try {
      logger.debug('Listing projects', pagination);

      const projects = await this.client.projects({
        first: pagination?.first,
        after: pagination?.after,
        before: pagination?.before,
        last: pagination?.last,
      });

      return projects;
    } catch (error) {
      logger.error('Failed to list projects', error);
      throw error;
    }
  }

  async getIssues(projectId: string, pagination?: Pagination) {
    try {
      const project = await this.get(projectId);
      if (!project) {
        throw new NotFoundError('Project', projectId);
      }

      const issues = await project.issues({
        first: pagination?.first,
        after: pagination?.after,
      });

      return issues;
    } catch (error) {
      logger.error(`Failed to get issues for project ${projectId}`, error);
      throw error;
    }
  }

  async getMilestones(projectId: string, pagination?: Pagination) {
    try {
      const project = await this.get(projectId);
      if (!project) {
        throw new NotFoundError('Project', projectId);
      }

      const milestones = await project.projectMilestones({
        first: pagination?.first,
        after: pagination?.after,
      });

      return milestones;
    } catch (error) {
      logger.error(`Failed to get milestones for project ${projectId}`, error);
      throw error;
    }
  }

  async getTeams(projectId: string) {
    try {
      const project = await this.get(projectId);
      if (!project) {
        throw new NotFoundError('Project', projectId);
      }

      const teams = await project.teams();
      return teams;
    } catch (error) {
      logger.error(`Failed to get teams for project ${projectId}`, error);
      throw error;
    }
  }
}

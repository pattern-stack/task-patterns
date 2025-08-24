import { 
  Project, 
  ProjectConnection,
  LinearDocument
} from '@linear/sdk';

type ProjectCreateInput = LinearDocument.ProjectCreateInput;
type ProjectUpdateInput = LinearDocument.ProjectUpdateInput;
import { linearClient } from '@atoms/client/linear-client';
import { logger } from '@atoms/shared/logger';
import { NotFoundError, ValidationError, Pagination } from '@atoms/types/common';
import { z } from 'zod';

export const ProjectCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  teamIds: z.array(z.string()).min(1),
  leadId: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
  targetDate: z.string().optional(),
  startDate: z.string().optional(),
  priority: z.number().min(0).max(4).optional(),
});

export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;

export const ProjectUpdateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  leadId: z.string().nullable().optional(),
  memberIds: z.array(z.string()).optional(),
  targetDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  priority: z.number().min(0).max(4).optional(),
  state: z.enum(['planned', 'started', 'paused', 'completed', 'canceled']).optional(),
});

export type ProjectUpdate = z.infer<typeof ProjectUpdateSchema>;

export class ProjectService {
  private client = linearClient.getClient();

  async create(data: ProjectCreate): Promise<Project> {
    try {
      logger.debug('Creating project', data);
      
      const input: ProjectCreateInput = {
        name: data.name,
        description: data.description,
        teamIds: data.teamIds,
        leadId: data.leadId,
        memberIds: data.memberIds,
        targetDate: data.targetDate,
        startDate: data.startDate,
        priority: data.priority,
      };

      const payload = await this.client.createProject(input);
      
      if (!payload.success || !payload.project) {
        throw new ValidationError('Failed to create project');
      }

      const project = await payload.project;
      logger.success(`Project created: ${project.name}`);
      
      return project;
    } catch (error) {
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
      logger.debug(`Updating project: ${id}`, data);
      
      const project = await this.get(id);
      if (!project) {
        throw new NotFoundError('Project', id);
      }

      const input: ProjectUpdateInput = {
        name: data.name,
        description: data.description,
        leadId: data.leadId,
        memberIds: data.memberIds,
        targetDate: data.targetDate,
        startDate: data.startDate,
        priority: data.priority,
        state: data.state,
      };

      const payload = await this.client.updateProject(id, input);
      
      if (!payload.success || !payload.project) {
        throw new ValidationError('Failed to update project');
      }

      const updatedProject = await payload.project;
      logger.success(`Project updated: ${updatedProject.name}`);
      
      return updatedProject;
    } catch (error) {
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
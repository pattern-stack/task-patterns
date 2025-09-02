import {
  Team,
  TeamConnection,
  WebhookConnection,
  TemplateConnection,
  Template,
  LinearClient,
} from '@linear/sdk';
import { logger } from '@atoms/shared/logger';
import { NotFoundError, Pagination, ValidationError } from '@atoms/types/common';
import { ZodError } from 'zod';
import {
  TeamCreate,
  TeamUpdate,
  TeamSettingsUpdate,
  TemplateCreate,
  validateTeamCreate,
  validateTeamUpdate,
  validateTeamSettingsUpdate,
  validateTemplateCreate,
} from './schemas';
import type { DataService } from '@atoms/contracts/service.contracts';

// Narrow settings projection available off Team where applicable
export type TeamSettings = {
  id: string;
  cyclesEnabled?: boolean;
  cycleStartDay?: number;
  cycleDuration?: number;
  triageEnabled?: boolean;
};

export class TeamService implements DataService<Team, TeamCreate, TeamUpdate> {
  constructor(private readonly client: LinearClient) {}

  async get(id: string): Promise<Team | null> {
    try {
      logger.debug(`Fetching team: ${id}`);
      const team = await this.client.team(id);
      return team;
    } catch (error: unknown) {
      logger.debug(`Team not found: ${id}`);
      return null;
    }
  }

  async getByKey(key: string): Promise<Team | null> {
    try {
      logger.debug(`Fetching team by key: ${key}`);

      const teams = await this.client.teams({
        filter: {
          key: { eq: key },
        },
        first: 1,
      });

      const nodes = await teams.nodes;
      return nodes.length > 0 ? nodes[0] : null;
    } catch (error: unknown) {
      logger.debug(`Team not found: ${key}`);
      return null;
    }
  }

  /**
   * Resolve a team identifier (key or UUID) to a team ID
   * This helper method standardizes team resolution across the app
   * @param keyOrId Team key (e.g., "DUG") or UUID
   * @returns Team UUID or null if not found
   */
  async resolveTeamId(keyOrId: string): Promise<string | null> {
    try {
      // First try as a team key (most common case)
      const teamByKey = await this.getByKey(keyOrId.toUpperCase());
      if (teamByKey) {
        return teamByKey.id;
      }

      // Then try as a UUID
      const teamById = await this.get(keyOrId);
      if (teamById) {
        return teamById.id;
      }

      logger.debug(`Could not resolve team identifier: ${keyOrId}`);
      return null;
    } catch (error: unknown) {
      logger.debug(`Failed to resolve team identifier: ${keyOrId}`, error);
      return null;
    }
  }

  async list(pagination?: Pagination): Promise<TeamConnection> {
    try {
      logger.debug('Listing teams', pagination);

      const teams = await this.client.teams({
        first: pagination?.first,
        after: pagination?.after,
        before: pagination?.before,
        last: pagination?.last,
      });

      return teams;
    } catch (error: unknown) {
      logger.error('Failed to list teams', error);
      throw error;
    }
  }

  async getMembers(teamId: string, pagination?: Pagination) {
    try {
      const team = await this.get(teamId);
      if (!team) {
        throw new NotFoundError('Team', teamId);
      }

      const members = await team.members({
        first: pagination?.first,
        after: pagination?.after,
      });

      return members;
    } catch (error: unknown) {
      logger.error(`Failed to get members for team ${teamId}`, error);
      throw error;
    }
  }

  async getProjects(teamId: string, pagination?: Pagination) {
    try {
      const team = await this.get(teamId);
      if (!team) {
        throw new NotFoundError('Team', teamId);
      }

      const projects = await team.projects({
        first: pagination?.first,
        after: pagination?.after,
      });

      return projects;
    } catch (error: unknown) {
      logger.error(`Failed to get projects for team ${teamId}`, error);
      throw error;
    }
  }

  async getCycles(teamId: string, pagination?: Pagination) {
    try {
      const team = await this.get(teamId);
      if (!team) {
        throw new NotFoundError('Team', teamId);
      }

      const cycles = await team.cycles({
        first: pagination?.first,
        after: pagination?.after,
      });

      return cycles;
    } catch (error: unknown) {
      logger.error(`Failed to get cycles for team ${teamId}`, error);
      throw error;
    }
  }

  async getWorkflowStates(teamId: string) {
    try {
      const team = await this.get(teamId);
      if (!team) {
        throw new NotFoundError('Team', teamId);
      }

      const states = await team.states();
      return states;
    } catch (error: unknown) {
      logger.error(`Failed to get workflow states for team ${teamId}`, error);
      throw error;
    }
  }

  async getLabels(teamId: string, pagination?: Pagination) {
    try {
      const team = await this.get(teamId);
      if (!team) {
        throw new NotFoundError('Team', teamId);
      }

      const labels = await team.labels({
        first: pagination?.first,
        after: pagination?.after,
      });

      return labels;
    } catch (error: unknown) {
      logger.error(`Failed to get labels for team ${teamId}`, error);
      throw error;
    }
  }

  // NEW CRUD operations
  async create(data: TeamCreate): Promise<Team> {
    try {
      logger.debug('Creating team', data);

      // Validate input data
      const validatedData = validateTeamCreate(data);

      // Check if team key already exists
      const existingTeam = await this.getByKey(validatedData.key);
      if (existingTeam) {
        throw new ValidationError(`Team key '${validatedData.key}' already exists`);
      }

      const payload = await this.client.createTeam(validatedData);

      if (!payload.success || !payload.team) {
        throw new Error('Failed to create team');
      }

      const team = await payload.team;
      logger.info(`Team created: ${team.id}`);
      return team;
    } catch (error: unknown) {
      if (error instanceof ValidationError) {
        throw error;
      }
      if (error instanceof ZodError) {
        throw new ValidationError('Invalid team data', error);
      }
      logger.error('Failed to create team', error);
      throw error;
    }
  }

  async update(id: string, data: TeamUpdate): Promise<Team> {
    try {
      logger.debug(`Updating team: ${id}`, data);

      // Validate input data
      const validatedData = validateTeamUpdate(data);

      const payload = await this.client.updateTeam(id, validatedData);

      if (!payload.success || !payload.team) {
        throw new Error('Failed to update team');
      }

      const team = await payload.team;
      logger.info(`Team updated: ${id}`);
      return team;
    } catch (error: unknown) {
      if (error instanceof ValidationError) {
        throw error;
      }
      if (error instanceof ZodError) {
        throw new ValidationError('Invalid team update data', error);
      }
      logger.error(`Failed to update team ${id}`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      logger.debug(`Deleting team: ${id}`);

      const payload = await this.client.deleteTeam(id);

      if (payload.success) {
        logger.info(`Team deleted: ${id}`);
        return true;
      }

      return false;
    } catch (error: unknown) {
      logger.error(`Failed to delete team ${id}`, error);
      throw error;
    }
  }

  async merge(sourceId: string, targetId: string): Promise<Team> {
    try {
      logger.debug(`Merging team ${sourceId} into ${targetId}`);

      // Note: Linear SDK might not have teamMerge method, this would need to be implemented
      // as a custom operation or API call
      await Promise.resolve();
      throw new Error(
        'Team merge not implemented - Linear SDK does not support direct team merging',
      );
    } catch (error: unknown) {
      logger.error(`Failed to merge teams ${sourceId} -> ${targetId}`, error);
      throw error;
    }
  }

  // NEW team resource methods
  async getWebhooks(teamId: string): Promise<WebhookConnection> {
    try {
      const team = await this.get(teamId);
      if (!team) {
        throw new NotFoundError('Team', teamId);
      }

      const webhooks = await team.webhooks();
      return webhooks;
    } catch (error: unknown) {
      logger.error(`Failed to get webhooks for team ${teamId}`, error);
      throw error;
    }
  }

  async getSettings(teamId: string): Promise<TeamSettings> {
    try {
      const team = await this.get(teamId);
      if (!team) {
        throw new NotFoundError('Team', teamId);
      }

      // Note: Team settings might not be directly available through the team object
      // This would typically be retrieved through the team's properties or a separate query
      const maybeTeamWithSettings = team as unknown as Partial<Omit<TeamSettings, 'id'>>;
      const settings: TeamSettings = {
        id: `settings-${teamId}`,
        cyclesEnabled: maybeTeamWithSettings.cyclesEnabled,
        cycleStartDay: maybeTeamWithSettings.cycleStartDay,
        cycleDuration: maybeTeamWithSettings.cycleDuration,
        triageEnabled: maybeTeamWithSettings.triageEnabled,
      };
      return settings;
    } catch (error: unknown) {
      logger.error(`Failed to get settings for team ${teamId}`, error);
      throw error;
    }
  }

  async updateSettings(teamId: string, settings: TeamSettingsUpdate): Promise<Team> {
    try {
      logger.debug(`Updating settings for team: ${teamId}`, settings);

      // Validate input data
      const validatedSettings = validateTeamSettingsUpdate(settings);

      // Note: updateTeamSettings might not exist, would use updateTeam instead
      const payload = await this.client.updateTeam(teamId, validatedSettings);

      if (!payload.success || !payload.team) {
        throw new Error('Failed to update team settings');
      }

      const updated = await payload.team;
      logger.info(`Team settings updated: ${teamId}`);
      return updated;
    } catch (error: unknown) {
      if (error instanceof ValidationError) {
        throw error;
      }
      if (error instanceof ZodError) {
        throw new ValidationError('Invalid team settings data', error);
      }
      logger.error(`Failed to update settings for team ${teamId}`, error);
      throw error;
    }
  }

  async getIssueTemplates(teamId: string): Promise<TemplateConnection> {
    try {
      const team = await this.get(teamId);
      if (!team) {
        throw new NotFoundError('Team', teamId);
      }

      const templates = await team.templates();
      return templates;
    } catch (error: unknown) {
      logger.error(`Failed to get templates for team ${teamId}`, error);
      throw error;
    }
  }

  async createIssueTemplate(teamId: string, templateData: TemplateCreate): Promise<Template> {
    try {
      logger.debug(`Creating template for team: ${teamId}`, templateData);

      // Validate input data
      const validatedTemplate = validateTemplateCreate(templateData);

      const payload = await this.client.createTemplate({
        ...validatedTemplate,
        teamId,
      });

      if (!payload.success || !payload.template) {
        throw new Error('Failed to create template');
      }

      const template = await payload.template;
      logger.info(`Template created for team ${teamId}: ${template.id}`);
      return template;
    } catch (error: unknown) {
      if (error instanceof ValidationError) {
        throw error;
      }
      if (error instanceof ZodError) {
        throw new ValidationError('Invalid template data', error);
      }
      logger.error(`Failed to create template for team ${teamId}`, error);
      throw error;
    }
  }
}

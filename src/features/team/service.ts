import { Team, TeamConnection } from '@linear/sdk';
import { linearClient } from '@atoms/client/linear-client';
import { logger } from '@atoms/shared/logger';
import { NotFoundError, Pagination } from '@atoms/types/common';

export class TeamService {
  private client = linearClient.getClient();

  async get(id: string): Promise<Team | null> {
    try {
      logger.debug(`Fetching team: ${id}`);
      const team = await this.client.team(id);
      return team;
    } catch (error) {
      logger.debug(`Team not found: ${id}`);
      return null;
    }
  }

  async getByKey(key: string): Promise<Team | null> {
    try {
      logger.debug(`Fetching team by key: ${key}`);
      
      const teams = await this.client.teams({
        filter: {
          key: { eq: key }
        },
        first: 1
      });

      const nodes = await teams.nodes;
      return nodes.length > 0 ? nodes[0] : null;
    } catch (error) {
      logger.debug(`Team not found: ${key}`);
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      logger.error(`Failed to get labels for team ${teamId}`, error);
      throw error;
    }
  }
}
import {
  Cycle,
  CycleConnection,
  Issue,
  IssueConnection,
  LinearDocument,
  LinearClient,
} from '@linear/sdk';

type CycleCreateInput = LinearDocument.CycleCreateInput;
type CycleUpdateInput = LinearDocument.CycleUpdateInput;
type LinearCycleFilter = LinearDocument.CycleFilter;
type LinearIssueFilter = LinearDocument.IssueFilter;

import { logger } from '@atoms/shared/logger';
import { NotFoundError, ValidationError, Pagination } from '@atoms/types/common';
import { CycleCreate, CycleUpdate, CycleFilter, CycleProgress } from './schemas';
import { IssueFilter } from '@features/issue/schemas';
import type { DataService } from '@atoms/contracts/service.contracts';

export class CycleService implements DataService<Cycle, CycleCreate, CycleUpdate> {
  constructor(private readonly client: LinearClient) {}

  async create(data: CycleCreate): Promise<Cycle> {
    try {
      logger.debug('Creating cycle', data);

      // Check for overlapping cycles within the same team
      await this.validateNonOverlapping(data.teamId, data.startsAt, data.endsAt);

      const input: CycleCreateInput = {
        name: data.name,
        teamId: data.teamId,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        description: data.description,
      };

      const payload = await this.client.createCycle(input);

      if (!payload.success || !payload.cycle) {
        throw new ValidationError('Failed to create cycle');
      }

      const cycle = await payload.cycle;
      logger.success(`Cycle created: ${cycle.name}`);

      return cycle;
    } catch (error) {
      logger.error('Failed to create cycle', error);
      throw error;
    }
  }

  async get(id: string): Promise<Cycle | null> {
    try {
      logger.debug(`Fetching cycle: ${id}`);
      const cycle = await this.client.cycle(id);
      return cycle;
    } catch (error) {
      logger.debug(`Cycle not found: ${id}`);
      return null;
    }
  }

  async update(id: string, data: CycleUpdate): Promise<Cycle> {
    try {
      logger.debug(`Updating cycle: ${id}`, data);

      const cycle = await this.get(id);
      if (!cycle) {
        throw new NotFoundError('Cycle', id);
      }

      // If updating dates, check for overlapping cycles
      if (data.startsAt || data.endsAt) {
        const startDate = data.startsAt || cycle.startsAt.toISOString();
        const endDate = data.endsAt || cycle.endsAt.toISOString();
        const team = cycle.team ? await cycle.team : null;
        if (!team) {
          throw new NotFoundError('Team for cycle', id);
        }

        await this.validateNonOverlapping(team.id, startDate, endDate, id);
      }

      const input: CycleUpdateInput = {
        name: data.name,
        description: data.description,
        startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
        endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
      };

      const payload = await this.client.updateCycle(id, input);

      if (!payload.success || !payload.cycle) {
        throw new ValidationError('Failed to update cycle');
      }

      const updatedCycle = await payload.cycle;
      logger.success(`Cycle updated: ${updatedCycle.name}`);

      return updatedCycle;
    } catch (error) {
      logger.error(`Failed to update cycle ${id}`, error);
      throw error;
    }
  }

  async archive(id: string): Promise<boolean> {
    try {
      logger.debug(`Archiving cycle: ${id}`);

      const cycle = await this.get(id);
      if (!cycle) {
        throw new NotFoundError('Cycle', id);
      }

      const payload = await this.client.archiveCycle(id);

      if (!payload.success) {
        throw new ValidationError('Failed to archive cycle');
      }

      logger.success(`Cycle archived: ${id}`);
      return true;
    } catch (error) {
      logger.error(`Failed to archive cycle ${id}`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    // Cycles cannot be deleted in Linear, only archived
    logger.warn(`Delete called on cycle ${id}, will archive instead (cycles cannot be deleted)`);
    return this.archive(id);
  }

  async list(filter?: CycleFilter, pagination?: Pagination): Promise<CycleConnection> {
    try {
      logger.debug('Listing cycles', { filter, pagination });

      const linearFilter: LinearCycleFilter = {};

      if (filter) {
        if (filter.teamId) {
          linearFilter.team = { id: { eq: filter.teamId } };
        }
      }

      const cycles = await this.client.cycles({
        filter: linearFilter,
        includeArchived: filter?.includeArchived,
        first: pagination?.first,
        after: pagination?.after,
        before: pagination?.before,
        last: pagination?.last,
      });

      return cycles;
    } catch (error) {
      logger.error('Failed to list cycles', error);
      throw error;
    }
  }

  async getActive(teamId: string): Promise<Cycle | null> {
    try {
      logger.debug(`Getting active cycle for team: ${teamId}`);

      const cycles = await this.client.cycles({
        filter: {
          team: { id: { eq: teamId } },
        },
        includeArchived: false,
      });

      const cycleNodes = await cycles.nodes;
      const now = new Date();

      // Find cycle where current time is between start and end dates
      const activeCycle = cycleNodes.find((cycle) => {
        const startDate = new Date(cycle.startsAt);
        const endDate = new Date(cycle.endsAt);
        return now >= startDate && now <= endDate;
      });

      return activeCycle || null;
    } catch (error) {
      logger.error(`Failed to get active cycle for team ${teamId}`, error);
      throw error;
    }
  }

  async getUpcoming(teamId: string): Promise<CycleConnection> {
    try {
      logger.debug(`Getting upcoming cycles for team: ${teamId}`);

      const cycles = await this.client.cycles({
        filter: {
          team: { id: { eq: teamId } },
        },
        includeArchived: false,
      });

      const cycleNodes = await cycles.nodes;
      const now = new Date();

      // Filter cycles that start in the future
      const upcomingCycles = cycleNodes.filter((cycle) => {
        const startDate = new Date(cycle.startsAt);
        return startDate > now;
      });

      // Return as connection format (simplified mock for now)
      return {
        ...cycles,
        nodes: upcomingCycles,
      } as CycleConnection;
    } catch (error) {
      logger.error(`Failed to get upcoming cycles for team ${teamId}`, error);
      throw error;
    }
  }

  async getCompleted(teamId: string): Promise<CycleConnection> {
    try {
      logger.debug(`Getting completed cycles for team: ${teamId}`);

      const cycles = await this.client.cycles({
        filter: {
          team: { id: { eq: teamId } },
        },
        includeArchived: false,
      });

      const cycleNodes = await cycles.nodes;

      // Filter cycles that have a completedAt date
      const completedCycles = cycleNodes.filter((cycle) => cycle.completedAt);

      // Return as connection format (simplified mock for now)
      return {
        ...cycles,
        nodes: completedCycles,
      } as CycleConnection;
    } catch (error) {
      logger.error(`Failed to get completed cycles for team ${teamId}`, error);
      throw error;
    }
  }

  async getIssues(cycleId: string, filter?: IssueFilter): Promise<IssueConnection> {
    try {
      logger.debug(`Getting issues for cycle: ${cycleId}`);

      const linearFilter: LinearIssueFilter = {
        cycle: { id: { eq: cycleId } },
      };

      if (filter) {
        if (filter.state) {
          linearFilter.state = { type: { eq: filter.state } };
        }
        if (filter.assigneeId) {
          linearFilter.assignee = { id: { eq: filter.assigneeId } };
        }
      }

      const issues = await this.client.issues({
        filter: linearFilter,
        includeArchived: false,
      });

      return issues;
    } catch (error) {
      logger.error(`Failed to get issues for cycle ${cycleId}`, error);
      throw error;
    }
  }

  async addIssue(cycleId: string, issueId: string): Promise<Issue> {
    try {
      logger.debug(`Adding issue ${issueId} to cycle ${cycleId}`);

      try {
        const issue = await this.client.issue(issueId);
        if (!issue) {
          throw new NotFoundError('Issue', issueId);
        }
      } catch (error) {
        throw new NotFoundError('Issue', issueId);
      }

      const payload = await this.client.updateIssue(issueId, {
        cycleId: cycleId,
      });

      if (!payload.success || !payload.issue) {
        throw new ValidationError('Failed to add issue to cycle');
      }

      const updatedIssue = await payload.issue;
      logger.success(`Issue added to cycle: ${updatedIssue.identifier}`);

      return updatedIssue;
    } catch (error) {
      logger.error(`Failed to add issue ${issueId} to cycle ${cycleId}`, error);
      throw error;
    }
  }

  async removeIssue(cycleId: string, issueId: string): Promise<Issue> {
    try {
      logger.debug(`Removing issue ${issueId} from cycle ${cycleId}`);

      try {
        const issue = await this.client.issue(issueId);
        if (!issue) {
          throw new NotFoundError('Issue', issueId);
        }
      } catch (error) {
        throw new NotFoundError('Issue', issueId);
      }

      const payload = await this.client.updateIssue(issueId, {
        cycleId: null,
      });

      if (!payload.success || !payload.issue) {
        throw new ValidationError('Failed to remove issue from cycle');
      }

      const updatedIssue = await payload.issue;
      logger.success(`Issue removed from cycle: ${updatedIssue.identifier}`);

      return updatedIssue;
    } catch (error) {
      logger.error(`Failed to remove issue ${issueId} from cycle ${cycleId}`, error);
      throw error;
    }
  }

  async getProgress(cycleId: string): Promise<CycleProgress> {
    try {
      logger.debug(`Calculating progress for cycle: ${cycleId}`);

      const cycle = await this.get(cycleId);
      if (!cycle) {
        throw new NotFoundError('Cycle', cycleId);
      }

      const issues = await this.getIssues(cycleId);
      const issueNodes = await issues.nodes;

      let completedPoints = 0;
      let totalPoints = 0;
      let completedIssues = 0;
      const totalIssues = issueNodes.length;

      for (const issue of issueNodes) {
        const estimate = issue.estimate || 0;
        totalPoints += estimate;

        if (issue.completedAt) {
          completedPoints += estimate;
          completedIssues++;
        }
      }

      const percentComplete =
        totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

      return {
        completedPoints,
        totalPoints,
        percentComplete,
        completedIssues,
        totalIssues,
      };
    } catch (error) {
      logger.error(`Failed to calculate progress for cycle ${cycleId}`, error);
      throw error;
    }
  }

  async getVelocity(cycleId: string): Promise<number> {
    try {
      logger.debug(`Calculating velocity for cycle: ${cycleId}`);

      const cycle = await this.get(cycleId);
      if (!cycle) {
        throw new NotFoundError('Cycle', cycleId);
      }

      const issues = await this.getIssues(cycleId);
      const issueNodes = await issues.nodes;

      let completedPoints = 0;
      for (const issue of issueNodes) {
        if (issue.completedAt && issue.estimate) {
          completedPoints += issue.estimate;
        }
      }

      // Calculate cycle duration in weeks
      const startDate = new Date(cycle.startsAt);
      const endDate = new Date(cycle.endsAt);
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationWeeks = durationMs / (1000 * 60 * 60 * 24 * 7);

      // Velocity = completed points per week
      const velocity = durationWeeks > 0 ? completedPoints / durationWeeks : 0;

      return velocity;
    } catch (error) {
      logger.error(`Failed to calculate velocity for cycle ${cycleId}`, error);
      throw error;
    }
  }

  private async validateNonOverlapping(
    teamId: string,
    startsAt: string,
    endsAt: string,
    excludeCycleId?: string,
  ): Promise<void> {
    const existingCycles = await this.client.cycles({
      filter: {
        team: { id: { eq: teamId } },
      },
      includeArchived: false,
    });

    const cycleNodes = await existingCycles.nodes;
    const newStart = new Date(startsAt);
    const newEnd = new Date(endsAt);

    for (const cycle of cycleNodes) {
      if (excludeCycleId && cycle.id === excludeCycleId) {
        continue; // Skip the cycle being updated
      }

      const existingStart = new Date(cycle.startsAt);
      const existingEnd = new Date(cycle.endsAt);

      // Check for overlap: new cycle starts before existing ends AND new cycle ends after existing starts
      const hasOverlap = newStart < existingEnd && newEnd > existingStart;

      if (hasOverlap) {
        throw new ValidationError(`Cycle dates overlap with existing cycle: ${cycle.name}`);
      }
    }
  }
}

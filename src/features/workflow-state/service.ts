import {
  WorkflowState,
  WorkflowStateConnection,
  IssueConnection,
  LinearDocument,
} from '@linear/sdk';

type WorkflowStateUpdateInput = LinearDocument.WorkflowStateUpdateInput;
type LinearWorkflowStateFilter = LinearDocument.WorkflowStateFilter;
type LinearIssueFilter = LinearDocument.IssueFilter;

import { linearClient } from '@atoms/client/linear-client';
import { logger } from '@atoms/shared/logger';
import { NotFoundError, ValidationError } from '@atoms/types/common';
import {
  WorkflowStateUpdate,
  WorkflowStateFilter,
  WorkflowStateUpdateSchema,
  WorkflowStateFilterSchema,
  WorkflowStateType,
  WorkflowStateTypeEnum,
  DefaultStateCategory,
  DefaultStateCategoryEnum,
  Pagination,
  BatchResult,
  IssueFilter,
} from './schemas';

export class WorkflowStateService {
  private client = linearClient.getClient();

  /**
   * Get a workflow state by ID
   */
  async get(id: string): Promise<WorkflowState | null> {
    try {
      logger.debug(`Fetching workflow state: ${id}`);
      const state = await this.client.workflowState(id);
      return state;
    } catch (error) {
      logger.debug(`Workflow state not found: ${id}`);
      return null;
    }
  }

  /**
   * List workflow states with optional filters
   */
  async list(
    filter?: WorkflowStateFilter,
    pagination?: Pagination,
  ): Promise<WorkflowStateConnection> {
    try {
      // Validate filter if provided
      if (filter) {
        WorkflowStateFilterSchema.parse(filter);
      }

      logger.debug('Listing workflow states', { filter, pagination });

      const linearFilter: LinearWorkflowStateFilter = {};

      if (filter) {
        if (filter.teamId) {
          linearFilter.team = { id: { eq: filter.teamId } };
        }

        if (filter.type) {
          linearFilter.type = { eq: filter.type };
        }

        if (filter.name) {
          if (filter.name.eq) {
            linearFilter.name = { eq: filter.name.eq };
          } else if (filter.name.contains) {
            linearFilter.name = { contains: filter.name.contains };
          }
        }
      }

      const states = await this.client.workflowStates({
        filter: linearFilter,
        includeArchived: filter?.includeArchived,
        first: pagination?.first,
        after: pagination?.after,
        before: pagination?.before,
        last: pagination?.last,
      });

      return states;
    } catch (error: unknown) {
      if (error?.name === 'ZodError') {
        throw new ValidationError(
          `Invalid filter: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
      logger.error('Failed to list workflow states', error);
      throw error;
    }
  }

  /**
   * List workflow states for a specific team
   */
  async listByTeam(teamId: string): Promise<WorkflowStateConnection> {
    try {
      logger.debug(`Listing workflow states for team: ${teamId}`);

      const states = await this.client.workflowStates({
        filter: {
          team: { id: { eq: teamId } },
        },
        includeArchived: false,
      });

      return states;
    } catch (error) {
      logger.error(`Failed to list workflow states for team ${teamId}`, error);
      throw error;
    }
  }

  /**
   * Update workflow state properties
   */
  async update(id: string, data: WorkflowStateUpdate): Promise<WorkflowState> {
    try {
      // Validate input
      const validatedData = WorkflowStateUpdateSchema.parse(data);

      logger.debug(`Updating workflow state: ${id}`, validatedData);

      // Check if state exists
      const state = await this.get(id);
      if (!state) {
        throw new NotFoundError('WorkflowState', id);
      }

      const input: WorkflowStateUpdateInput = {
        name: validatedData.name,
        color: validatedData.color,
        description: validatedData.description,
        position: validatedData.position,
      };

      const payload = await this.client.updateWorkflowState(id, input);

      if (!payload.success || !payload.workflowState) {
        throw new ValidationError('Failed to update workflow state');
      }

      const updatedState = await payload.workflowState;
      logger.success(`Workflow state updated: ${updatedState.name}`);

      return updatedState;
    } catch (error: unknown) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      if (error?.name === 'ZodError') {
        throw new ValidationError(
          `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
      logger.error(`Failed to update workflow state ${id}`, error);
      throw error;
    }
  }

  /**
   * Archive a workflow state
   */
  async archive(id: string): Promise<boolean> {
    try {
      logger.debug(`Archiving workflow state: ${id}`);

      // Check if state exists
      const state = await this.get(id);
      if (!state) {
        throw new NotFoundError('WorkflowState', id);
      }

      const payload = await this.client.archiveWorkflowState(id);

      if (!payload.success) {
        logger.error(`Failed to archive workflow state: ${id}`);
        return false;
      }

      logger.success(`Workflow state archived: ${id}`);
      return true;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error(`Failed to archive workflow state ${id}`, error);
      throw error;
    }
  }

  /**
   * Get workflow states by type for a team
   */
  async getByType(teamId: string, type: WorkflowStateType): Promise<WorkflowState[]> {
    try {
      // Validate type
      WorkflowStateTypeEnum.parse(type);

      logger.debug(`Getting ${type} workflow states for team: ${teamId}`);

      const states = await this.client.workflowStates({
        filter: {
          team: { id: { eq: teamId } },
          type: { eq: type },
        },
      });

      const nodes = await states.nodes;
      return nodes;
    } catch (error: unknown) {
      if (error?.name === 'ZodError') {
        throw new ValidationError(`Invalid workflow state type: ${type}`);
      }
      logger.error(`Failed to get workflow states by type`, error);
      throw error;
    }
  }

  /**
   * Get default workflow state for a category
   */
  async getDefault(teamId: string, category: DefaultStateCategory): Promise<WorkflowState | null> {
    try {
      // Validate category
      DefaultStateCategoryEnum.parse(category);

      logger.debug(`Getting default ${category} state for team: ${teamId}`);

      const team = await this.client.team(teamId);
      if (!team) {
        throw new NotFoundError('Team', teamId);
      }

      let defaultState: WorkflowState | null = null;

      // Cast to interface to access these properties which exist at runtime
      // but are not typed in the Linear SDK
      const teamWithStates = team as {
        triageState: Promise<WorkflowState>;
        backlogState: Promise<WorkflowState>;
        untriagedState: Promise<WorkflowState>;
        mergedState: Promise<WorkflowState>;
      };

      switch (category) {
        case 'triage':
          defaultState = await teamWithStates.triageState;
          break;
        case 'backlog':
          defaultState = await teamWithStates.backlogState;
          break;
        case 'started':
          defaultState = await teamWithStates.startedState;
          break;
      }

      return defaultState;
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error?.name === 'ZodError') {
        throw new ValidationError(`Invalid category: ${category}`);
      }
      logger.error(`Failed to get default state for ${category}`, error);
      throw error;
    }
  }

  /**
   * Get issues in a specific workflow state
   */
  async getIssues(
    stateId: string,
    filter?: IssueFilter,
    pagination?: Pagination,
  ): Promise<IssueConnection> {
    try {
      logger.debug(`Getting issues for workflow state: ${stateId}`);

      const linearFilter: LinearIssueFilter = {
        state: { id: { eq: stateId } },
        ...filter,
      };

      const issues = await this.client.issues({
        filter: linearFilter,
        first: pagination?.first,
        after: pagination?.after,
        before: pagination?.before,
        last: pagination?.last,
      });

      return issues;
    } catch (error) {
      logger.error(`Failed to get issues for state ${stateId}`, error);
      throw error;
    }
  }

  /**
   * Bulk move issues from one state to another
   */
  async moveIssues(fromStateId: string, toStateId: string): Promise<BatchResult> {
    try {
      logger.debug(`Moving issues from ${fromStateId} to ${toStateId}`);

      // Get all issues in the source state
      const issuesConnection = await this.getIssues(fromStateId, undefined, { first: 100 });
      const issues = await issuesConnection.nodes;

      const result: BatchResult = {
        success: false,
        succeeded: [],
        failed: [],
        totalCount: issues.length,
        successCount: 0,
        failureCount: 0,
      };

      // Move each issue to the target state
      for (const issue of issues) {
        try {
          const payload = await this.client.updateIssue(issue.id, {
            stateId: toStateId,
          });

          if (payload.success && payload.issue) {
            result.succeeded.push(await payload.issue);
            result.successCount++;
          } else {
            result.failed.push({
              item: issue.id,
              error: 'Update failed',
            });
            result.failureCount++;
          }
        } catch (error: unknown) {
          result.failed.push({
            item: issue.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          result.failureCount++;
        }
      }

      result.success = result.failureCount === 0;

      logger.info(`Bulk move completed: ${result.successCount}/${result.totalCount} succeeded`);

      return result;
    } catch (error) {
      logger.error(`Failed to move issues from ${fromStateId} to ${toStateId}`, error);
      throw error;
    }
  }

  /**
   * Validate if a state transition is allowed
   */
  async validateTransition(issueId: string, toStateId: string): Promise<boolean> {
    try {
      logger.debug(`Validating transition for issue ${issueId} to state ${toStateId}`);

      // Get the issue and its current state
      let issue;
      try {
        issue = await this.client.issue(issueId);
      } catch (error) {
        throw new NotFoundError('Issue', issueId);
      }

      if (!issue) {
        throw new NotFoundError('Issue', issueId);
      }

      const currentState = await issue.state;
      if (!currentState) {
        throw new ValidationError('Issue has no current state');
      }

      // Get the target state
      const targetState = await this.get(toStateId);
      if (!targetState) {
        throw new NotFoundError('WorkflowState', toStateId);
      }

      // Basic validation rules
      // These are simplified - Linear has more complex rules
      const currentType = currentState.type;
      const targetType = targetState.type;

      // Can't move from completed/canceled back to triage
      if ((currentType === 'completed' || currentType === 'canceled') && targetType === 'triage') {
        return false;
      }

      // Most other transitions are allowed
      return true;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logger.error(`Failed to validate transition`, error);
      throw error;
    }
  }
}

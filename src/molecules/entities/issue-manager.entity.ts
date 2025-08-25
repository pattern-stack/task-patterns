import { Issue, Comment } from '@linear/sdk';
import { IssueService } from '@features/issue/service';
import { CommentService } from '@features/comment/service';
import { TeamService } from '@features/team/service';
import { UserService } from '@features/user/service';
import { LabelService } from '@features/label/service';
import { WorkflowStateService } from '@features/workflow-state/service';
import { ProjectService } from '@features/project/service';
import { IssueCreate } from '@features/issue/schemas';
import { CommentCreate } from '@features/comment/schemas';
import { logger } from '@atoms/shared/logger';
import { NotFoundError } from '@atoms/types/common';
import { IssueIdentifierParser } from '@atoms/parsers/issue-identifier.parser';
import { NaturalQueryParser, ParsedQuery } from '@atoms/parsers/natural-query.parser';
import {
  QuickCreateOptions,
  IssueCreationResult,
  SmartSearchOptions,
  SmartSearchResult,
  BulkUpdateResult,
  CommentOptions,
} from './types/issue-manager.types';

export class IssueManagerEntity {
  constructor(
    private issueService: IssueService,
    private commentService: CommentService,
    private teamService: TeamService,
    private userService: UserService,
    private labelService: LabelService,
    private workflowStateService: WorkflowStateService,
    private projectService: ProjectService,
  ) {}

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
   * Move multiple issues to a new status
   */
  async moveToStatus(
    issueIdentifiers: string[],
    statusName: string,
    comment?: string,
  ): Promise<BulkUpdateResult> {
    try {
      logger.info(`Moving ${issueIdentifiers.length} issues to status: ${statusName}`);

      const result: BulkUpdateResult = {
        updated: [],
        failed: [],
        summary: '',
        totalCount: issueIdentifiers.length,
        successCount: 0,
        failureCount: 0,
      };

      // Resolve all issue identifiers
      const resolvedIssues = await this.resolveIdentifiers(issueIdentifiers);

      // Get unique team IDs from resolved issues
      const teamIds = new Set<string>();
      for (const resolved of resolvedIssues.values()) {
        if (resolved) {
          const team = await resolved.team;
          if (team) {
            teamIds.add(team.id);
          }
        }
      }

      // Find the workflow state for each team
      const stateMap = new Map<string, string>();
      for (const teamId of teamIds) {
        const state = await this.workflowStateService.getByTeamAndName(teamId, statusName);
        if (state) {
          stateMap.set(teamId, state.id);
        }
      }

      // Process each issue
      for (const [identifier, issue] of resolvedIssues.entries()) {
        if (!issue) {
          result.failed.push({
            identifier,
            error: 'Issue not found',
          });
          result.failureCount++;
          continue;
        }

        try {
          const team = await issue.team;
          const stateId = team ? stateMap.get(team.id) : undefined;

          if (!stateId) {
            result.failed.push({
              identifier,
              error: `Status "${statusName}" not found for team`,
              issue,
            });
            result.failureCount++;
            continue;
          }

          // Update issue status
          const updated = await this.issueService.update(issue.id, { stateId });
          result.updated.push(updated);
          result.successCount++;

          // Add comment if provided
          if (comment) {
            try {
              await this.commentService.create({
                issueId: issue.id,
                body: comment,
              });
            } catch (error) {
              logger.warn(`Failed to add comment to issue ${identifier}`, error);
            }
          }
        } catch (error: unknown) {
          result.failed.push({
            identifier,
            error: error instanceof Error ? error.message : 'Unknown error',
            issue,
          });
          result.failureCount++;
        }
      }

      result.summary = `Moved ${result.successCount}/${result.totalCount} issues to ${statusName}`;
      if (result.failureCount > 0) {
        result.summary += `. ${result.failureCount} failed.`;
      }

      return result;
    } catch (error) {
      logger.error('Failed to move issues to status', error);
      throw error;
    }
  }

  /**
   * Smart search with natural language query parsing
   */
  async smartSearch(query: string, options?: SmartSearchOptions): Promise<SmartSearchResult> {
    try {
      logger.info(`Smart search: ${query}`);

      // Parse the natural language query
      const parsed = NaturalQueryParser.parse(query);

      // Resolve team if provided
      let teamId: string | undefined;
      if (options?.team) {
        const team = await this.resolveTeamByKey(options.team);
        if (team) {
          teamId = team.id;
        }
      }

      // Build search filter
      const filter: Record<string, unknown> = {};

      // Add team filter
      if (teamId) {
        filter.teamId = teamId;
      }

      // Add assignee filter
      if (options?.assignee || parsed.filters.assignee?.length) {
        const assigneeRef = options?.assignee || parsed.filters.assignee![0];
        if (assigneeRef === '@me' || assigneeRef === 'me') {
          // TODO: Get current user from context
          logger.warn('Current user resolution not implemented yet');
        } else {
          const user = await this.resolveUserByEmail(assigneeRef);
          if (user) {
            filter.assigneeId = user.id;
          }
        }
      }

      // Add priority filter
      if (options?.priority?.length || parsed.filters.priority?.length) {
        const priorities = options?.priority || parsed.filters.priority!;
        // Convert priority names to numbers
        const priorityMap: Record<string, number> = {
          urgent: 1,
          high: 2,
          medium: 3,
          low: 4,
        };
        const priorityNumbers = priorities
          .map((p) => priorityMap[p.toLowerCase()])
          .filter((n) => n !== undefined);
        if (priorityNumbers.length > 0) {
          filter.priority = priorityNumbers[0]; // Linear only supports single priority filter
        }
      }

      // Add status filter
      if (options?.status?.length || parsed.filters.status?.length) {
        const statuses = options?.status || parsed.filters.status!;
        // TODO: Resolve status names to workflow state types
        if (statuses.includes('todo')) {
          filter.state = 'backlog';
        } else if (statuses.includes('in-progress')) {
          filter.state = 'started';
        } else if (statuses.includes('done')) {
          filter.state = 'completed';
        }
      }

      // Add keyword search
      const searchQuery = parsed.keywords.join(' ');
      if (searchQuery) {
        filter.searchQuery = searchQuery;
      }

      // Execute search
      // Cast filter to IssueFilter type - safe because we build it properly above
      const issues = await this.issueService.list(filter as Parameters<IssueService['list']>[0], {
        first: options?.limit || 50,
      });

      const nodes = await issues.nodes;
      const pageInfo = await issues.pageInfo;

      return {
        issues: nodes,
        totalCount: pageInfo.hasNextPage ? nodes.length + 1 : nodes.length,
        parsedQuery: JSON.stringify(parsed),
        appliedFilters: filter,
        confidence: parsed.confidence,
        suggestions: this.generateSearchSuggestions(parsed, nodes.length),
      };
    } catch (error) {
      logger.error('Smart search failed', error);
      throw error;
    }
  }

  /**
   * Bulk assign issues to a user
   */
  async bulkAssign(issueIdentifiers: string[], assigneeEmail: string): Promise<BulkUpdateResult> {
    try {
      logger.info(`Bulk assigning ${issueIdentifiers.length} issues to ${assigneeEmail}`);

      // Resolve assignee
      const user = await this.resolveUserByEmail(assigneeEmail);
      if (!user) {
        throw new NotFoundError('User', assigneeEmail);
      }

      const result: BulkUpdateResult = {
        updated: [],
        failed: [],
        summary: '',
        totalCount: issueIdentifiers.length,
        successCount: 0,
        failureCount: 0,
      };

      // Resolve all issue identifiers
      const resolvedIssues = await this.resolveIdentifiers(issueIdentifiers);

      // Process each issue
      for (const [identifier, issue] of resolvedIssues.entries()) {
        if (!issue) {
          result.failed.push({
            identifier,
            error: 'Issue not found',
          });
          result.failureCount++;
          continue;
        }

        try {
          const updated = await this.issueService.update(issue.id, {
            assigneeId: user.id,
          });
          result.updated.push(updated);
          result.successCount++;
        } catch (error: unknown) {
          result.failed.push({
            identifier,
            error: error instanceof Error ? error.message : 'Unknown error',
            issue,
          });
          result.failureCount++;
        }
      }

      const userName = user.displayName || user.name || 'User';
      result.summary = `Assigned ${result.successCount}/${result.totalCount} issues to ${userName}`;
      if (result.failureCount > 0) {
        result.summary += `. ${result.failureCount} failed.`;
      }

      return result;
    } catch (error) {
      logger.error('Bulk assign failed', error);
      throw error;
    }
  }

  /**
   * Add a quick comment to an issue
   */
  async addQuickComment(
    issueIdentifier: string,
    comment: string,
    _options?: CommentOptions,
  ): Promise<Comment> {
    try {
      logger.info(`Adding comment to issue: ${issueIdentifier}`);

      // Resolve issue
      const issue = await this.resolveIdentifier(issueIdentifier);
      if (!issue) {
        throw new NotFoundError('Issue', issueIdentifier);
      }

      // Create comment
      const commentData: CommentCreate = {
        issueId: issue.id,
        body: comment,
        // TODO: Add support for private comments and parent comments
      };

      const createdComment = await this.commentService.create(commentData);
      return createdComment;
    } catch (error) {
      logger.error('Failed to add comment', error);
      throw error;
    }
  }

  /**
   * Resolve an issue identifier (ENG-123, #123, UUID) to an Issue
   */
  async resolveIdentifier(identifier: string): Promise<Issue | null> {
    try {
      const parsed = IssueIdentifierParser.parse(identifier);
      if (!parsed) {
        return null;
      }

      switch (parsed.type) {
        case 'uuid':
          return await this.issueService.get(parsed.uuid!);
        case 'team-number':
          return await this.issueService.getByIdentifier(`${parsed.teamKey}-${parsed.number}`);
        case 'number-only':
          // Try to find by number alone (less reliable)
          return await this.issueService.getByIdentifier(`${parsed.number}`);
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
  async resolveIdentifiers(identifiers: string[]): Promise<Map<string, Issue | null>> {
    const results = new Map<string, Issue | null>();
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

  /**
   * Generate search suggestions based on parsed query
   */
  private generateSearchSuggestions(parsed: ParsedQuery, resultCount: number): string[] {
    const suggestions: string[] = [];

    if (resultCount === 0) {
      suggestions.push('Try broadening your search terms');
      if (parsed.filters.status?.length) {
        suggestions.push('Try removing status filter');
      }
      if (parsed.filters.priority?.length) {
        suggestions.push('Try removing priority filter');
      }
    }

    if (parsed.confidence < 0.5) {
      suggestions.push('Try using more specific keywords');
      suggestions.push('Use filters like "status:todo" or "priority:high"');
    }

    return suggestions;
  }
}

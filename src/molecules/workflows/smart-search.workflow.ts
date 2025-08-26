import { Issue, LinearClient } from '@linear/sdk';
import { IssueService } from '@features/issue/service';
import { TeamService } from '@features/team/service';
import { UserService } from '@features/user/service';
import { NaturalQueryParser, ParsedQuery } from '@atoms/parsers/natural-query.parser';
import { logger } from '@atoms/shared/logger';
import { linearClient } from '@atoms/client/linear-client';

export interface SmartSearchOptions {
  team?: string;
  assignee?: string;
  priority?: string[];
  status?: string[];
  limit?: number;
}

export interface SmartSearchResult {
  issues: Issue[];
  totalCount: number;
  parsedQuery: string;
  appliedFilters: Record<string, unknown>;
  confidence: number;
  suggestions?: string[];
}

/**
 * Workflow for intelligent cross-entity search operations
 */
export class SmartSearchWorkflow {
  private issueService: IssueService;
  private teamService: TeamService;
  private userService: UserService;

  constructor(client?: LinearClient) {
    const actualClient = client || linearClient.getClient();
    this.issueService = new IssueService(actualClient);
    this.teamService = new TeamService(actualClient);
    this.userService = new UserService(actualClient);
  }

  /**
   * Smart search with natural language query parsing
   */
  async search(query: string, options?: SmartSearchOptions): Promise<SmartSearchResult> {
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

      // Add includeArchived flag
      filter.includeArchived = false;

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
   * Search for issues by team
   */
  async searchByTeam(teamKey: string, limit = 50): Promise<Issue[]> {
    try {
      const team = await this.resolveTeamByKey(teamKey);
      if (!team) {
        return [];
      }

      const issues = await this.issueService.list(
        { teamId: team.id, includeArchived: false },
        { first: limit },
      );

      return await issues.nodes;
    } catch (error) {
      logger.error('Search by team failed', error);
      throw error;
    }
  }

  /**
   * Search for issues assigned to a user
   */
  async searchByAssignee(emailOrUsername: string, limit = 50): Promise<Issue[]> {
    try {
      const user = await this.resolveUserByEmail(emailOrUsername);
      if (!user) {
        return [];
      }

      const issues = await this.issueService.list(
        { assigneeId: user.id, includeArchived: false },
        { first: limit },
      );

      return await issues.nodes;
    } catch (error) {
      logger.error('Search by assignee failed', error);
      throw error;
    }
  }

  /**
   * Search for high priority issues
   */
  async searchHighPriority(limit = 50): Promise<Issue[]> {
    try {
      // Note: Linear API doesn't support 'in' operator for priority, using urgent only
      const issues = await this.issueService.list(
        { priority: 1, includeArchived: false }, // Urgent priority
        { first: limit },
      );

      return await issues.nodes;
    } catch (error) {
      logger.error('Search high priority failed', error);
      throw error;
    }
  }

  /**
   * Search for issues due soon
   * Note: Linear API doesn't support dueDate filtering in list query
   * This would need to be implemented differently, perhaps fetching all issues and filtering client-side
   */
  async searchDueSoon(daysAhead = 7, limit = 50): Promise<Issue[]> {
    try {
      // For now, just return recent issues
      // TODO: Implement proper due date filtering
      const issues = await this.issueService.list({ includeArchived: false }, { first: limit });

      const nodes = await issues.nodes;
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      // Filter client-side for issues with due dates
      return nodes.filter((issue) => {
        if (issue.dueDate) {
          const dueDate = new Date(issue.dueDate);
          return dueDate <= futureDate;
        }
        return false;
      });
    } catch (error) {
      logger.error('Search due soon failed', error);
      throw error;
    }
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

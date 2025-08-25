import { Issue } from '@linear/sdk';

export interface QuickCreateOptions {
  description?: string;
  priority?: 0 | 1 | 2 | 3 | 4; // Linear priority scale
  assignee?: string; // Email or username
  labels?: string[]; // Label names (not IDs)
  project?: string; // Project name (not ID)
  parent?: string; // Parent issue identifier
  dueDate?: Date;
}

export interface IssueCreationResult {
  issue: Issue;
  url: string;
  identifier: string; // e.g., "ENG-123"
  warnings?: string[];
}

export interface SmartSearchOptions {
  team?: string; // Team key or ID
  assignee?: string; // Email, username, or @me
  status?: string[]; // Status names
  priority?: string[]; // Priority names (urgent, high, medium, low)
  limit?: number;
  includeArchived?: boolean;
}

export interface SmartSearchResult {
  issues: Issue[];
  totalCount: number;
  parsedQuery: string;
  appliedFilters: Record<string, unknown>;
  confidence: number;
  suggestions?: string[];
}

export interface BulkUpdateResult {
  updated: Issue[];
  failed: BulkUpdateFailure[];
  summary: string;
  totalCount: number;
  successCount: number;
  failureCount: number;
}

export interface BulkUpdateFailure {
  identifier: string;
  error: string;
  issue?: Issue;
}

export interface CommentOptions {
  private?: boolean;
  notify?: boolean;
  parentId?: string; // For threaded comments
}

export interface ResolvedIdentifier {
  original: string;
  issue: Issue | null;
  error?: string;
}

export interface TeamInfo {
  id: string;
  key: string;
  name: string;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  displayName: string;
}

export interface StatusInfo {
  id: string;
  name: string;
  type: string;
  color: string;
}

export interface LabelInfo {
  id: string;
  name: string;
  color: string;
}

export interface ProjectInfo {
  id: string;
  name: string;
  key: string;
}

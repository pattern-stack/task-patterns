import {
  LinearClient,
  Issue,
  Team,
  Project,
  User,
  WorkflowState,
  Cycle,
  IssueLabel,
  Comment,
} from '@linear/sdk';

// Helper to create mock connections with proper structure
export const createMockConnection = <T>(nodes: T[], overrides = {}): any => ({
  __typename: 'Connection',
  nodes,
  edges: nodes.map((node: any, index: number) => ({
    __typename: 'Edge',
    node,
    cursor: `cursor-${index}`,
  })),
  pageInfo: {
    __typename: 'PageInfo',
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: nodes.length > 0 ? 'cursor-0' : null,
    endCursor: nodes.length > 0 ? `cursor-${nodes.length - 1}` : null,
  },
  // Add Connection class methods
  fetchNext: jest.fn().mockResolvedValue({ nodes: [] }),
  fetchPrevious: jest.fn().mockResolvedValue({ nodes: [] }),
  _fetch: jest.fn(),
  _appendNodes: jest.fn(),
  _prependNodes: jest.fn(),
  _appendPageInfo: jest.fn(),
  _prependPageInfo: jest.fn(),
  ...overrides,
});

// Mock Linear SDK types with proper __typename
export const createMockIssue = (overrides = {}): any => ({
  __typename: 'Issue',
  id: 'issue-123',
  identifier: 'ENG-123',
  title: 'Test Issue',
  description: 'Test description',
  priority: 2,
  estimate: 3,
  url: 'https://linear.app/team/issue/ENG-123',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
  teamId: 'team-123',
  team: jest.fn().mockResolvedValue(createMockTeam()),
  assignee: jest.fn().mockResolvedValue(createMockUser()),
  state: jest.fn().mockResolvedValue(createMockWorkflowState()),
  labels: jest.fn().mockResolvedValue(createMockConnection([])),
  comments: jest.fn().mockResolvedValue(createMockConnection([])),
  attachments: jest.fn().mockResolvedValue(createMockConnection([])),
  children: jest.fn().mockResolvedValue(createMockConnection([])),
  project: jest.fn().mockResolvedValue(null),
  projectId: null,
  cycle: jest.fn().mockResolvedValue(null),
  cycleId: null,
  ...overrides,
});

export const createMockTeam = (overrides = {}): any => ({
  __typename: 'Team',
  id: 'team-123',
  key: 'ENG',
  name: 'Engineering',
  description: 'Engineering team',
  members: jest.fn().mockResolvedValue(createMockConnection([createMockUser()])),
  projects: jest.fn().mockResolvedValue(createMockConnection([])),
  cycles: jest.fn().mockResolvedValue(createMockConnection([])),
  states: jest.fn().mockResolvedValue(createMockConnection([createMockWorkflowState()])),
  labels: jest.fn().mockResolvedValue(createMockConnection([])),
  webhooks: jest.fn().mockResolvedValue(createMockConnection([])),
  settings: jest.fn().mockResolvedValue({
    id: 'settings-123',
    cyclesEnabled: true,
    cycleStartDay: 1,
    cycleDuration: 14,
    triageEnabled: true,
  }),
  templates: jest.fn().mockResolvedValue(createMockConnection([])),
  triageState: jest
    .fn()
    .mockResolvedValue(createMockWorkflowState({ type: 'triage', name: 'Triage' })),
  backlogState: jest
    .fn()
    .mockResolvedValue(createMockWorkflowState({ type: 'backlog', name: 'Backlog' })),
  startedState: jest
    .fn()
    .mockResolvedValue(createMockWorkflowState({ type: 'started', name: 'In Progress' })),
  ...overrides,
});

export const createMockProject = (overrides = {}): any => ({
  __typename: 'Project',
  id: 'project-123',
  name: 'Test Project',
  description: 'Test project description',
  state: 'started',
  priority: 2,
  url: 'https://linear.app/team/project/project-123',
  startDate: '2024-01-01',
  targetDate: '2024-12-31',
  lead: jest.fn().mockResolvedValue(createMockUser()),
  teams: jest.fn().mockResolvedValue(createMockConnection([createMockTeam()])),
  issues: jest.fn().mockResolvedValue(createMockConnection([])),
  projectMilestones: jest.fn().mockResolvedValue(createMockConnection([])),
  ...overrides,
});

export const createMockUser = (overrides = {}): any => ({
  __typename: 'User',
  id: 'user-123',
  name: 'Test User',
  displayName: 'Test User',
  email: 'test@example.com',
  avatarUrl: 'https://avatar.example.com',
  admin: false,
  active: true,
  statusEmoji: null,
  statusLabel: null,
  statusUntilAt: null,
  timezone: 'UTC',
  settings: jest.fn().mockResolvedValue({
    id: 'settings-123',
    notificationPreferences: { email: true, slack: false },
    timezone: 'America/New_York',
    theme: 'dark',
  }),
  ...overrides,
});

export const createMockWorkflowState = (overrides = {}): any => ({
  __typename: 'WorkflowState',
  id: 'state-123',
  name: 'In Progress',
  type: 'started',
  position: 1,
  color: '#4287f5',
  description: '',
  teamId: 'team-123',
  isDefault: false,
  ...overrides,
});

export const createMockCycle = (overrides = {}): any => ({
  __typename: 'Cycle',
  id: 'cycle-123',
  name: 'Sprint 1',
  number: 1,
  startsAt: '2024-01-01',
  endsAt: '2024-01-14',
  completedAt: null,
  team: jest.fn().mockResolvedValue(createMockTeam()),
  ...overrides,
});

export const createMockLabel = (overrides = {}): any => ({
  __typename: 'IssueLabel',
  id: 'label-123',
  name: 'Bug',
  color: '#ff0000',
  parent: null,
  ...overrides,
});

export const createMockComment = (overrides: any = {}): any => ({
  __typename: 'Comment',
  id: 'comment-123',
  body: 'Test comment',
  createdAt: new Date('2024-01-01'),
  editedAt: overrides.edited ? new Date('2024-01-02') : undefined,
  user: jest.fn().mockResolvedValue(createMockUser()),
  parent: jest
    .fn()
    .mockResolvedValue(overrides.parentId ? createMockComment({ id: overrides.parentId }) : null),
  issue: jest.fn().mockResolvedValue(null),
  children: jest.fn().mockResolvedValue(createMockConnection([])),
  ...overrides,
});

// Specialized connection mocks
export const createMockIssueConnection = (nodes: any[], overrides = {}): any => ({
  ...createMockConnection(nodes, overrides),
  __typename: 'IssueConnection',
});

export const createMockTeamConnection = (nodes: any[], overrides = {}): any => ({
  ...createMockConnection(nodes, overrides),
  __typename: 'TeamConnection',
});

export const createMockProjectConnection = (nodes: any[], overrides = {}): any => ({
  ...createMockConnection(nodes, overrides),
  __typename: 'ProjectConnection',
});

export const createMockCycleConnection = (nodes: any[], overrides = {}): any => ({
  ...createMockConnection(nodes, overrides),
  __typename: 'CycleConnection',
});

export const createMockUserConnection = (nodes: any[], overrides = {}): any => ({
  ...createMockConnection(nodes, overrides),
  __typename: 'UserConnection',
});

export const createMockLabelConnection = (nodes: any[], overrides = {}): any => ({
  ...createMockConnection(nodes, overrides),
  __typename: 'IssueLabelConnection',
});

// Fix payload structure
export const createMockPayload = (success = true, entity?: any) => ({
  __typename: entity?.__typename ? `${entity.__typename}Payload` : 'Payload',
  success,
  lastSyncId: 123, // Should be number
  // Use proper entity detection based on __typename
  issue: entity?.__typename === 'Issue' ? entity : undefined,
  project: entity?.__typename === 'Project' ? entity : undefined,
  team: entity?.__typename === 'Team' ? entity : undefined,
  cycle: entity?.__typename === 'Cycle' ? entity : undefined,
  issueLabel: entity?.__typename === 'IssueLabel' ? entity : undefined,
  comment: entity?.__typename === 'Comment' ? entity : undefined,
  reaction: entity?.__typename === 'Reaction' ? entity : undefined,
  user: entity?.__typename === 'User' ? entity : undefined,
  teamMembership: entity?.__typename === 'TeamMembership' ? entity : undefined,
  template: entity?.__typename === 'Template' ? entity : undefined,
  workflowState: entity?.__typename === 'WorkflowState' ? entity : undefined,
  // Fallback for settings and other objects without __typename
  ...(entity && !entity.__typename ? entity : {}),
});

// Mock Linear Client with proper return types
export const createMockLinearClient = () => ({
  viewer: Promise.resolve(
    createMockUser({
      id: 'viewer-123',
      name: 'Current User',
      email: 'viewer@example.com',
    }),
  ),

  // Issue methods
  issue: jest.fn().mockImplementation((id: string) => Promise.resolve(createMockIssue({ id }))),
  issues: jest
    .fn()
    .mockImplementation((options = {}) =>
      Promise.resolve(createMockIssueConnection([createMockIssue()])),
    ),
  createIssue: jest
    .fn()
    .mockImplementation((input) =>
      Promise.resolve(createMockPayload(true, createMockIssue({ __typename: 'Issue', ...input }))),
    ),
  updateIssue: jest
    .fn()
    .mockImplementation((id, input) =>
      Promise.resolve(
        createMockPayload(true, createMockIssue({ __typename: 'Issue', id, ...input })),
      ),
    ),
  deleteIssue: jest.fn().mockImplementation(() => Promise.resolve(createMockPayload(true))),
  archiveIssue: jest.fn().mockImplementation(() => Promise.resolve(createMockPayload(true))),

  // Team methods
  team: jest.fn().mockImplementation((id: string) => Promise.resolve(createMockTeam({ id }))),
  teams: jest
    .fn()
    .mockImplementation((options = {}) =>
      Promise.resolve(createMockTeamConnection([createMockTeam()])),
    ),
  createTeam: jest
    .fn()
    .mockImplementation((input) =>
      Promise.resolve(createMockPayload(true, createMockTeam({ __typename: 'Team', ...input }))),
    ),
  updateTeam: jest
    .fn()
    .mockImplementation((id, input) =>
      Promise.resolve(
        createMockPayload(true, createMockTeam({ __typename: 'Team', id, ...input })),
      ),
    ),
  deleteTeam: jest.fn().mockImplementation(() => Promise.resolve(createMockPayload(true))),
  createTemplate: jest
    .fn()
    .mockImplementation((input) =>
      Promise.resolve(
        createMockPayload(true, { id: 'template-new', __typename: 'Template', ...input }),
      ),
    ),

  // Project methods
  project: jest.fn().mockImplementation((id: string) => Promise.resolve(createMockProject({ id }))),
  projects: jest
    .fn()
    .mockImplementation((options = {}) =>
      Promise.resolve(createMockProjectConnection([createMockProject()])),
    ),
  createProject: jest
    .fn()
    .mockImplementation((input) =>
      Promise.resolve(
        createMockPayload(true, createMockProject({ __typename: 'Project', ...input })),
      ),
    ),
  updateProject: jest
    .fn()
    .mockImplementation((id, input) =>
      Promise.resolve(
        createMockPayload(true, createMockProject({ __typename: 'Project', id, ...input })),
      ),
    ),
  deleteProject: jest.fn().mockImplementation(() => Promise.resolve(createMockPayload(true))),

  // Cycle methods
  cycle: jest.fn().mockImplementation((id: string) => Promise.resolve(createMockCycle({ id }))),
  cycles: jest
    .fn()
    .mockImplementation((options = {}) =>
      Promise.resolve(createMockCycleConnection([createMockCycle()])),
    ),
  createCycle: jest
    .fn()
    .mockImplementation((input) =>
      Promise.resolve(createMockPayload(true, createMockCycle({ __typename: 'Cycle', ...input }))),
    ),
  updateCycle: jest
    .fn()
    .mockImplementation((id, input) =>
      Promise.resolve(
        createMockPayload(true, createMockCycle({ __typename: 'Cycle', id, ...input })),
      ),
    ),
  archiveCycle: jest.fn().mockImplementation(() => Promise.resolve(createMockPayload(true))),

  // Comment methods
  comment: jest
    .fn()
    .mockImplementation((options: { id: string }) =>
      Promise.resolve(createMockComment({ id: options.id })),
    ),
  comments: jest
    .fn()
    .mockImplementation((options = {}) =>
      Promise.resolve(createMockConnection([createMockComment()])),
    ),
  createComment: jest
    .fn()
    .mockImplementation((input) =>
      Promise.resolve(
        createMockPayload(true, createMockComment({ __typename: 'Comment', ...input })),
      ),
    ),
  updateComment: jest
    .fn()
    .mockImplementation((id, input) =>
      Promise.resolve(
        createMockPayload(true, createMockComment({ __typename: 'Comment', id, ...input })),
      ),
    ),
  deleteComment: jest.fn().mockImplementation(() => Promise.resolve(createMockPayload(true))),

  // Reaction methods
  createReaction: jest
    .fn()
    .mockImplementation((input) =>
      Promise.resolve(
        createMockPayload(true, { id: 'reaction-123', emoji: input.emoji, __typename: 'Reaction' }),
      ),
    ),
  deleteReaction: jest.fn().mockImplementation(() => Promise.resolve(createMockPayload(true))),

  // Label methods
  issueLabel: jest
    .fn()
    .mockImplementation((id: string) => Promise.resolve(createMockLabel({ id }))),
  issueLabels: jest
    .fn()
    .mockImplementation((options = {}) =>
      Promise.resolve(createMockLabelConnection([createMockLabel()])),
    ),
  createIssueLabel: jest
    .fn()
    .mockImplementation((input) =>
      Promise.resolve(
        createMockPayload(true, createMockLabel({ __typename: 'IssueLabel', ...input })),
      ),
    ),
  updateIssueLabel: jest
    .fn()
    .mockImplementation((id, input) =>
      Promise.resolve(
        createMockPayload(true, createMockLabel({ __typename: 'IssueLabel', id, ...input })),
      ),
    ),
  deleteIssueLabel: jest.fn().mockImplementation(() => Promise.resolve(createMockPayload(true))),

  // User methods
  user: jest.fn().mockImplementation((id: string) => Promise.resolve(createMockUser({ id }))),
  users: jest
    .fn()
    .mockImplementation((options = {}) =>
      Promise.resolve(createMockUserConnection([createMockUser()])),
    ),
  updateUser: jest
    .fn()
    .mockImplementation((id, input) =>
      Promise.resolve(
        createMockPayload(true, createMockUser({ __typename: 'User', id, ...input })),
      ),
    ),

  // Team membership methods
  teamMemberships: jest.fn().mockImplementation((options = {}) =>
    Promise.resolve(
      createMockConnection([
        {
          id: 'membership-123',
          user: jest.fn().mockResolvedValue(createMockUser()),
          team: jest.fn().mockResolvedValue(createMockTeam()),
          __typename: 'TeamMembership',
        },
      ]),
    ),
  ),
  createTeamMembership: jest.fn().mockImplementation((input) =>
    Promise.resolve(
      createMockPayload(true, {
        id: 'membership-123',
        user: createMockUser({ id: input.userId }),
        team: createMockTeam({ id: input.teamId }),
        __typename: 'TeamMembership',
      }),
    ),
  ),
  deleteTeamMembership: jest
    .fn()
    .mockImplementation(() => Promise.resolve(createMockPayload(true))),

  // User settings methods
  updateUserSettings: jest
    .fn()
    .mockImplementation((id, input) =>
      Promise.resolve(createMockPayload(true, { id: 'settings-123', ...input })),
    ),

  // WorkflowState methods
  workflowState: jest
    .fn()
    .mockImplementation((id: string) => Promise.resolve(createMockWorkflowState({ id }))),
  workflowStates: jest
    .fn()
    .mockImplementation((options = {}) =>
      Promise.resolve(createMockConnection([createMockWorkflowState()])),
    ),
  updateWorkflowState: jest
    .fn()
    .mockImplementation((id, input) =>
      Promise.resolve(
        createMockPayload(
          true,
          createMockWorkflowState({ __typename: 'WorkflowState', id, ...input }),
        ),
      ),
    ),
  archiveWorkflowState: jest
    .fn()
    .mockImplementation(() => Promise.resolve(createMockPayload(true))),
});

// Mock the Linear SDK module
jest.mock('@linear/sdk', () => ({
  LinearClient: jest.fn().mockImplementation(() => createMockLinearClient()),

  // Export mock types
  Issue: {},
  Team: {},
  Project: {},
  User: {},
  Comment: {},
  Cycle: {},
  Label: {},
  WorkflowState: {},
}));

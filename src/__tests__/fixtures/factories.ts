import { IssueCreate, IssueUpdate, IssueFilter } from '@features/issue/schemas';
import { ProjectCreate, ProjectUpdate } from '@features/project/service';
import { CycleCreate, CycleUpdate, CycleFilter } from '@features/cycle/schemas';

// Factory functions for creating test data
export class TestFactory {
  private static counter = 0;

  static reset() {
    this.counter = 0;
  }

  static nextId(): string {
    return `id-${++this.counter}`;
  }

  static uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  static issueCreate(overrides: Partial<IssueCreate> = {}): IssueCreate {
    return {
      title: `Test Issue ${this.nextId()}`,
      teamId: this.uuid(),
      description: 'Test issue description',
      priority: 2,
      estimate: 3,
      ...overrides,
    };
  }

  static issueUpdate(overrides: Partial<IssueUpdate> = {}): IssueUpdate {
    return {
      title: `Updated Issue ${this.nextId()}`,
      priority: 3,
      ...overrides,
    };
  }

  static issueFilter(overrides: Partial<IssueFilter> = {}): IssueFilter {
    return {
      teamId: this.uuid(),
      includeArchived: false,
      ...overrides,
    };
  }

  static projectCreate(overrides: Partial<ProjectCreate> = {}): ProjectCreate {
    return {
      name: `Test Project ${this.nextId()}`,
      teamIds: [this.uuid()],
      description: 'Test project description',
      ...overrides,
    };
  }

  static projectUpdate(overrides: Partial<ProjectUpdate> = {}): ProjectUpdate {
    return {
      name: `Updated Project ${this.nextId()}`,
      state: 'started',
      ...overrides,
    };
  }

  static bulkIssueIds(count = 3): string[] {
    return Array.from({ length: count }, () => this.uuid());
  }

  static cycleCreate(overrides: Partial<CycleCreate> = {}): CycleCreate {
    const now = new Date();
    const startDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Start in 7 days
    const endDate = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 week duration

    return {
      name: `Sprint ${this.nextId()}`,
      teamId: this.uuid(),
      startsAt: startDate.toISOString(),
      endsAt: endDate.toISOString(),
      description: 'Test cycle description',
      ...overrides,
    };
  }

  static cycleUpdate(overrides: Partial<CycleUpdate> = {}): CycleUpdate {
    return {
      name: `Updated Sprint ${this.nextId()}`,
      description: 'Updated cycle description',
      ...overrides,
    };
  }

  static cycleFilter(overrides: Partial<CycleFilter> = {}): CycleFilter {
    return {
      teamId: this.uuid(),
      includeArchived: false,
      ...overrides,
    };
  }

  static sprintPlanningOptions(overrides: any = {}) {
    return {
      teamId: this.uuid(),
      cycleId: this.uuid(),
      issueIds: this.bulkIssueIds(),
      ...overrides,
    };
  }

  static labelCreate(overrides: any = {}) {
    return {
      name: `Test Label ${this.nextId()}`,
      color: '#FF5733',
      description: 'Test label description',
      teamId: this.uuid(),
      ...overrides,
    };
  }

  static labelUpdate(overrides: any = {}) {
    return {
      name: `Updated Label ${this.nextId()}`,
      color: '#33FF57',
      description: 'Updated description',
      ...overrides,
    };
  }

  static labelFilter(overrides: any = {}) {
    return {
      teamId: this.uuid(),
      includeArchived: false,
      ...overrides,
    };
  }

  static commentCreate(overrides: any = {}) {
    return {
      issueId: this.uuid(),
      body: `Test comment ${this.nextId()}`,
      ...overrides,
    };
  }

  static commentUpdate(overrides: any = {}) {
    return {
      body: `Updated comment ${this.nextId()}`,
      ...overrides,
    };
  }

  static commentReply(parentId: string, overrides: any = {}) {
    return {
      issueId: this.uuid(),
      body: `Reply comment ${this.nextId()}`,
      parentId,
      ...overrides,
    };
  }
}

// Test data sets
export const testDataSets = {
  priorities: [0, 1, 2, 3, 4],
  
  issueStates: ['backlog', 'unstarted', 'started', 'completed', 'canceled'],
  
  projectStates: ['planned', 'started', 'paused', 'completed', 'canceled'],
  
  teamKeys: ['ENG', 'PROD', 'DESIGN', 'QA'],
  
  userEmails: [
    'john@example.com',
    'jane@example.com',
    'bob@example.com',
    'alice@example.com',
  ],
  
  labelNames: ['Bug', 'Feature', 'Enhancement', 'Documentation', 'Tech Debt'],
  
  cycleNames: ['Sprint 1', 'Sprint 2', 'Sprint 3', 'Sprint 4'],

  validEmojis: ['👍', '👎', '❤️', '🎉', '👀'],

  sampleMarkdown: [
    '**Bold** and *italic* text',
    'Here is some `inline code`',
    '# Heading\n\nParagraph with [link](https://example.com)',
    '- Item 1\n- Item 2\n  - Nested item',
    '```typescript\nconst x = 1;\nconsole.log(x);\n```',
  ],
};
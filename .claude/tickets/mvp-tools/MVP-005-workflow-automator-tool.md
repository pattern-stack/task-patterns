# MVP-005: Implement WorkflowAutomator Tool

**Status**: `todo`  
**Priority**: `low`  
**Estimate**: L (5 points)  
**Labels**: `mvp`, `tool`, `automation`  
**Team**: Engineering  

## Description

Implement the WorkflowAutomator tool for creating automation rules, batch processing, and workflow templates. Enables teams to automate repetitive tasks and maintain consistency.

## Implementation Details

### File: `src/organisms/tools/workflow-automator.tool.ts`

```typescript
export class WorkflowAutomatorTool {
  constructor(
    private ruleEngine: RuleEngine,
    private batchProcessor: BatchProcessor,
    private templateManager: TemplateManager,
    private integrationHub: IntegrationHub
  ) {}

  async createRule(rule: AutomationRule): Promise<CreatedRule>
  
  async processBatch(operation: BatchOperation): Promise<BatchResult>
  
  async applyTemplate(
    templateName: string,
    context: TemplateContext
  ): Promise<TemplateResult>
  
  async syncWithExternal(config: IntegrationConfig): Promise<SyncResult>
  
  // Rule management
  async listRules(teamId?: string): Promise<AutomationRule[]>
  async enableRule(ruleId: string): Promise<void>
  async disableRule(ruleId: string): Promise<void>
  async deleteRule(ruleId: string): Promise<void>
}
```

### New Molecules

### File: `src/molecules/engines/rule-engine.ts`

```typescript
export class RuleEngine {
  private activeRules: Map<string, AutomationRule> = new Map();
  
  async createRule(rule: AutomationRule): Promise<string> // returns ruleId
  async evaluateRule(rule: AutomationRule, context: RuleContext): Promise<boolean>
  async executeActions(actions: RuleAction[], context: RuleContext): Promise<ActionResult[]>
  
  // Event handling
  async processIssueEvent(event: IssueEvent): Promise<void>
  async processCommentEvent(event: CommentEvent): Promise<void>
  
  // Rule validation
  validateRule(rule: AutomationRule): ValidationResult
  
  private matchesCondition(condition: RuleCondition, context: RuleContext): boolean
  private executeAction(action: RuleAction, context: RuleContext): Promise<ActionResult>
}

interface AutomationRule {
  id?: string;
  name: string;
  description?: string;
  teamId?: string; // If null, applies to all teams user has access to
  active: boolean;
  trigger: {
    event: 'issue.created' | 'issue.updated' | 'issue.deleted' | 'comment.added' | 'cycle.started';
    conditions: RuleCondition[];
  };
  actions: RuleAction[];
  createdBy: string;
  createdAt: Date;
  lastTriggered?: Date;
  executionCount: number;
}

interface RuleCondition {
  field: string; // 'status', 'priority', 'assignee', 'labels', 'title', etc.
  operator: 'equals' | 'not_equals' | 'contains' | 'in' | 'not_in' | 'changed_from' | 'changed_to';
  value: any;
}

interface RuleAction {
  type: 'assign' | 'move_status' | 'add_label' | 'remove_label' | 'add_comment' | 'set_priority' | 'notify';
  params: Record<string, any>;
}
```

### File: `src/molecules/processors/batch-processor.ts`

```typescript
export class BatchProcessor {
  async processBatch(operation: BatchOperation): Promise<BatchResult> {
    const { type, filter, action, options } = operation;
    
    // Get affected issues
    const issues = await this.getMatchingIssues(filter);
    
    if (options?.preview) {
      return this.generatePreview(issues, action);
    }
    
    return await this.executeBatchOperation(issues, action, options);
  }
  
  private async executeBatchOperation(
    issues: Issue[],
    action: BatchAction,
    options?: BatchOptions
  ): Promise<BatchResult>
  
  private async getMatchingIssues(filter: IssueFilter): Promise<Issue[]>
  private generatePreview(issues: Issue[], action: BatchAction): BatchResult
  
  // Specific batch operations
  async bulkUpdateStatus(issueIds: string[], statusId: string): Promise<BatchResult>
  async bulkAssign(issueIds: string[], assigneeId: string): Promise<BatchResult>
  async bulkAddLabel(issueIds: string[], labelId: string): Promise<BatchResult>
  async bulkSetPriority(issueIds: string[], priority: number): Promise<BatchResult>
}

interface BatchOperation {
  type: 'bulk-update' | 'bulk-assign' | 'bulk-label' | 'bulk-priority';
  filter: IssueFilter;
  action: BatchAction;
  options?: BatchOptions;
}

interface BatchOptions {
  preview?: boolean;
  dryRun?: boolean;
  batchSize?: number; // Process in chunks
  retryFailures?: boolean;
}
```

### File: `src/molecules/managers/template-manager.ts`

```typescript
export class TemplateManager {
  private templates: Map<string, WorkflowTemplate> = new Map();
  
  constructor() {
    this.loadBuiltinTemplates();
  }
  
  async applyTemplate(
    templateName: string,
    context: TemplateContext
  ): Promise<TemplateResult>
  
  async createCustomTemplate(template: WorkflowTemplate): Promise<string>
  async getTemplate(name: string): Promise<WorkflowTemplate | null>
  async listTemplates(): Promise<WorkflowTemplate[]>
  
  private loadBuiltinTemplates(): void {
    // Load predefined templates
    this.templates.set('bug-triage', this.createBugTriageTemplate());
    this.templates.set('feature-workflow', this.createFeatureWorkflowTemplate());
    this.templates.set('release-planning', this.createReleasePlanningTemplate());
  }
  
  private createBugTriageTemplate(): WorkflowTemplate
  private createFeatureWorkflowTemplate(): WorkflowTemplate
  private createReleasePlanningTemplate(): WorkflowTemplate
}

interface WorkflowTemplate {
  name: string;
  description: string;
  category: 'bug-management' | 'feature-development' | 'release-management' | 'custom';
  steps: TemplateStep[];
  requiredContext: string[]; // Required context fields
}

interface TemplateStep {
  name: string;
  action: 'create_issue' | 'update_issue' | 'create_cycle' | 'assign_issue' | 'add_comment';
  params: Record<string, any>;
  conditions?: RuleCondition[];
}
```

### File: `src/molecules/hubs/integration-hub.ts`

```typescript
export class IntegrationHub {
  private integrations: Map<string, Integration> = new Map();
  
  async syncWithExternal(config: IntegrationConfig): Promise<SyncResult> {
    const integration = this.integrations.get(config.source);
    if (!integration) {
      throw new Error(`Integration not found: ${config.source}`);
    }
    
    return await integration.sync(config);
  }
  
  async registerIntegration(integration: Integration): Promise<void>
  async listIntegrations(): Promise<Integration[]>
  
  // Built-in integrations
  private createGitHubIntegration(): Integration
  private createSlackIntegration(): Integration
  private createJiraIntegration(): Integration
}

interface Integration {
  name: string;
  type: 'webhook' | 'api' | 'file';
  sync(config: IntegrationConfig): Promise<SyncResult>;
  validate(config: IntegrationConfig): ValidationResult;
}
```

## Supporting Types

```typescript
export interface CreatedRule {
  ruleId: string;
  active: boolean;
  validation: ValidationResult;
  estimatedTriggerFrequency?: string;
}

export interface BatchResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: { item: any; error: string }[];
  executionTime: number;
  summary: string;
  affectedIssues?: Issue[];
}

export interface TemplateResult {
  created: Issue[];
  updated: Issue[];
  cycles?: Cycle[];
  summary: string;
  warnings: string[];
}

export interface SyncResult {
  synced: number;
  created: number;
  updated: number;
  errors: any[];
  nextSync: Date;
  summary: string;
}
```

## CLI Integration

```bash
# Rule management
linear automate rule create --name "Auto-assign bugs" --trigger issue.created --condition "label:bug" --action "assign:john@company.com"
linear automate rule list --team eng
linear automate rule enable rule-123
linear automate rule disable rule-123

# Batch operations  
linear automate batch assign --filter "status:todo team:eng" --to john@company.com --preview
linear automate batch status --filter "assignee:john@company.com" --to "In Progress"
linear automate batch label --filter "priority:high" --add urgent --remove normal

# Templates
linear automate template apply bug-triage --issue issue-123
linear automate template apply feature-workflow --team eng --title "New login system"
linear automate template list

# Integrations
linear automate sync github --repo company/app --mapping config.json
linear automate sync slack --channel #eng --events issue.created,issue.updated
```

## Built-in Automation Rules

### Common Rule Templates

```typescript
const BUILTIN_RULES = {
  'auto-assign-bugs': {
    trigger: { event: 'issue.created', conditions: [{ field: 'labels', operator: 'contains', value: 'bug' }] },
    actions: [{ type: 'assign', params: { assignee: 'triage-lead' } }]
  },
  'high-priority-notification': {
    trigger: { event: 'issue.updated', conditions: [{ field: 'priority', operator: 'changed_to', value: 1 }] },
    actions: [{ type: 'notify', params: { channel: '#urgent', message: 'High priority issue created' } }]
  },
  'stale-issue-reminder': {
    trigger: { event: 'scheduled', conditions: [{ field: 'updated', operator: 'older_than', value: '7 days' }] },
    actions: [{ type: 'add_comment', params: { text: 'This issue has been idle for a week. Please update.' } }]
  }
};
```

## Acceptance Criteria

- [ ] Rule engine with trigger/condition/action logic
- [ ] Batch processing with preview and rollback capabilities
- [ ] Workflow templates for common scenarios
- [ ] Integration framework for external tools
- [ ] Rule validation and testing
- [ ] Performance: <5s for batch operations on 100 items
- [ ] Error handling with partial failure recovery
- [ ] CLI with comprehensive automation commands
- [ ] Built-in templates for common workflows
- [ ] Unit tests for rule engine and batch processing
- [ ] Integration tests with mock external services

## Dependencies

- All existing services for rule actions
- Event system for rule triggers  
- File storage for rule persistence
- HTTP client for external integrations

## Security Considerations

- Validate rule permissions (users can only create rules for accessible teams)
- Rate limiting for automation actions
- Audit logging for all automated actions
- Sandbox rule execution to prevent system abuse
- Encrypt sensitive integration credentials

## Notes

- Start with simple file-based rule storage
- Focus on most common automation patterns first
- Provide clear feedback on rule performance and impact
- Include safeguards against runaway automation
- Design for extensibility with plugin architecture
- Consider rate limits to prevent Linear API abuse
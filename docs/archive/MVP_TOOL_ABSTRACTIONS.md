# Linear Agent MVP - Tool Abstractions

## 🎯 MVP Goal
Create 5-7 high-level tool abstractions that handle 80% of common Linear workflows, built on our existing atomic services.

## 🛠️ Core MVP Tool Set

### **1. IssueManager** 
*The workhorse - handles 60% of daily Linear interactions*

```typescript
export class IssueManagerTool {
  // Quick issue creation with smart defaults
  async quickCreate(title: string, teamKey: string, options?: {
    description?: string;
    priority?: 'urgent' | 'high' | 'medium' | 'low';
    assignee?: string;
    labels?: string[];
  }): Promise<{
    issue: Issue;
    url: string;
    identifier: string; // e.g., "ENG-123"
  }>

  // Bulk status updates
  async moveToStatus(
    issueIdentifiers: string[], // ["ENG-123", "ENG-124"]
    status: string, // "In Progress", "Done", etc.
    comment?: string
  ): Promise<{
    updated: Issue[];
    failed: { identifier: string; error: string }[];
  }>

  // Smart search with natural language
  async smartSearch(query: string, options?: {
    team?: string;
    assignee?: string;
    status?: string[];
    priority?: string[];
    limit?: number;
  }): Promise<{
    issues: Issue[];
    totalCount: number;
    query: string; // Parsed/enhanced query
  }>

  // Batch operations
  async bulkAssign(
    issueIdentifiers: string[],
    assigneeEmail: string
  ): Promise<{ updated: Issue[]; failed: any[] }>

  // Quick commenting
  async addQuickComment(
    issueIdentifier: string,
    comment: string,
    options?: { private?: boolean; notify?: boolean }
  ): Promise<Comment>
}
```

### **2. SprintManager** 
*Sprint planning and cycle management*

```typescript
export class SprintManagerTool {
  // Intelligent sprint planning
  async planSprint(options: {
    teamKey: string;
    sprintGoal: string;
    capacity?: number; // Story points
    duration?: number; // Days
    startDate?: Date;
  }): Promise<{
    cycle: Cycle;
    recommendedIssues: Issue[];
    capacityAnalysis: {
      totalPoints: number;
      teamCapacity: number;
      utilization: number; // 0-1
      recommendation: string;
    }
  }>

  // Auto-assign based on workload
  async autoAssignSprint(
    cycleId: string,
    strategy?: 'balanced' | 'expertise' | 'availability'
  ): Promise<{
    assignments: { issue: Issue; assignee: User; reason: string }[];
    warnings: string[];
  }>

  // Sprint health check
  async getSprintHealth(cycleId: string): Promise<{
    progress: {
      completed: number;
      inProgress: number;
      todo: number;
      blocked: number;
    };
    burndown: { date: string; remaining: number }[];
    risks: string[];
    recommendations: string[];
  }>

  // Velocity tracking
  async getTeamVelocity(
    teamKey: string,
    cycleCount?: number
  ): Promise<{
    averageVelocity: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    lastNCycles: { cycle: Cycle; velocity: number }[];
    forecast: { nextSprint: number; confidence: number };
  }>
}
```

### **3. TeamInsights** 
*Team performance and project health*

```typescript
export class TeamInsightsTool {
  // Team dashboard
  async getTeamDashboard(teamKey: string): Promise<{
    activeWork: {
      totalIssues: number;
      byStatus: Record<string, number>;
      byAssignee: Record<string, number>;
      blockedIssues: Issue[];
    };
    recentActivity: {
      completedThisWeek: Issue[];
      createdThisWeek: Issue[];
      comments: number;
    };
    healthMetrics: {
      avgCycleTime: number; // Days
      bugRatio: number; // 0-1
      reopenRate: number; // 0-1
      velocity: number;
    };
  }>

  // Project health analysis
  async getProjectHealth(projectId: string): Promise<{
    status: 'on-track' | 'at-risk' | 'off-track';
    completion: {
      percentage: number;
      estimatedCompletion: Date;
      confidence: number;
    };
    blockers: {
      critical: Issue[];
      dependencies: { blocker: Issue; blocked: Issue[] }[];
    };
    recommendations: string[];
  }>

  // Find bottlenecks
  async findBottlenecks(teamKey: string): Promise<{
    staleIssues: Issue[]; // Issues not updated in X days
    overloadedMembers: { user: User; issueCount: number; recommendation: string }[];
    blockedWork: { issue: Issue; blockedBy: Issue; daysSince: number }[];
    processIssues: string[];
  }>
}
```

### **4. SmartSearch** 
*Advanced querying and filtering*

```typescript
export class SmartSearchTool {
  // Natural language search
  async search(query: string, context?: {
    team?: string;
    project?: string;
    timeframe?: 'this-week' | 'this-month' | 'this-quarter';
  }): Promise<{
    issues: Issue[];
    suggestions: string[];
    filters: {
      status?: string[];
      assignee?: string[];
      labels?: string[];
      priority?: string[];
    };
    totalCount: number;
  }>

  // Saved searches
  async saveSearch(
    name: string,
    query: string,
    filters: any
  ): Promise<{ id: string; name: string }>

  async getSavedSearches(): Promise<{
    id: string;
    name: string;
    query: string;
    lastUsed: Date;
  }[]>

  // Similar issue detection
  async findSimilarIssues(
    title: string,
    description?: string
  ): Promise<{
    duplicates: Issue[];
    related: Issue[];
    confidence: number; // 0-1
  }>

  // Advanced filters
  async buildComplexFilter(criteria: {
    teams?: string[];
    assignees?: string[];
    statuses?: string[];
    priorities?: string[];
    labels?: string[];
    dateRange?: { from: Date; to: Date };
    customFields?: Record<string, any>;
  }): Promise<{
    issues: Issue[];
    count: number;
    breakdown: Record<string, number>;
  }>
}
```

### **5. WorkflowAutomator** 
*Automation and integrations*

```typescript
export class WorkflowAutomatorTool {
  // Setup automation rules
  async createRule(rule: {
    name: string;
    trigger: {
      event: 'issue.created' | 'issue.updated' | 'comment.added';
      conditions: { field: string; operator: string; value: any }[];
    };
    actions: {
      type: 'assign' | 'move-status' | 'add-label' | 'comment' | 'notify';
      params: any;
    }[];
  }): Promise<{ ruleId: string; active: boolean }>

  // Batch processing
  async processBatch(operation: {
    type: 'bulk-update' | 'bulk-assign' | 'bulk-label';
    filter: any;
    action: any;
    preview?: boolean;
  }): Promise<{
    affectedCount: number;
    preview?: Issue[];
    warnings?: string[];
  }>

  // Template workflows
  async applyTemplate(
    templateName: 'bug-triage' | 'feature-workflow' | 'release-planning',
    context: any
  ): Promise<{
    created: Issue[];
    updated: Issue[];
    summary: string;
  }>

  // Integration helpers
  async syncWithExternal(config: {
    source: 'github' | 'slack' | 'jira';
    mapping: any;
    options: any;
  }): Promise<{
    synced: number;
    errors: any[];
    nextSync: Date;
  }>
}
```

## 🧩 Implementation Strategy

### **Molecule Layer Enhancements**
Build these new molecule-level components:

1. **IssueManagerMolecule** - Combines IssueService + CommentService + LabelService
2. **SprintManagerMolecule** - Combines CycleService + IssueService + TeamService  
3. **TeamInsightsMolecule** - Analytics across all services
4. **SmartSearchMolecule** - Advanced querying with AI-like capabilities
5. **WorkflowAutomatorMolecule** - Rule engine + batch operations

### **New Organism Layer**
Create high-level tool interfaces:

```
src/organisms/tools/
├── issue-manager.tool.ts
├── sprint-manager.tool.ts  
├── team-insights.tool.ts
├── smart-search.tool.ts
└── workflow-automator.tool.ts
```

### **Enhanced CLI Interface**
User-friendly commands:

```bash
# Quick issue operations
linear issue create "Fix login bug" --team eng --assign john@company.com
linear issue move ENG-123 ENG-124 --to "In Review" --comment "Ready for review"

# Sprint management  
linear sprint plan --team eng --goal "Authentication overhaul" --capacity 40
linear sprint health --current

# Team insights
linear team dashboard --team eng
linear team bottlenecks --team eng

# Smart search
linear search "high priority bugs assigned to me"
linear search save "My P0 bugs" --query "priority:urgent assignee:me"

# Automation
linear automate batch-assign --filter "status:todo team:eng" --assign john@company.com
```

## 📊 Success Metrics

**MVP Success Criteria:**
- ✅ 80% of common Linear workflows covered
- ✅ <2 commands for typical user actions  
- ✅ Real-world usable with actual Linear workspace
- ✅ Sub-second response times for common operations
- ✅ Intelligent defaults minimize user input

**Performance Targets:**
- Issue creation: <500ms
- Search results: <1s  
- Bulk operations: <5s for 50 items
- Dashboard loading: <2s

This MVP focuses on **practical utility** over feature completeness, building on our solid atomic foundation to create genuinely useful high-level tools.
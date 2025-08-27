# MVP-003: Implement TeamInsights Tool

**Status**: `todo`  
**Priority**: `medium`  
**Estimate**: M (3 points)  
**Labels**: `mvp`, `tool`, `analytics`  
**Team**: Engineering  

## Description

Implement the TeamInsights tool for team performance monitoring, project health analysis, and bottleneck identification. Provides actionable insights for team leads and project managers.

## Implementation Details

### File: `src/organisms/tools/team-insights.tool.ts`

```typescript
export class TeamInsightsTool {
  constructor(
    private teamService: TeamService,
    private issueService: IssueService,
    private cycleService: CycleService,
    private metricsCalculator: MetricsCalculator,
    private bottleneckDetector: BottleneckDetector
  ) {}

  async getTeamDashboard(teamKey: string): Promise<TeamDashboard>
  
  async getProjectHealth(projectId: string): Promise<ProjectHealthReport>
  
  async findBottlenecks(teamKey: string): Promise<BottleneckReport>
  
  async getPerformanceMetrics(
    teamKey: string,
    timeframe?: TimeFrame
  ): Promise<PerformanceMetrics>
}
```

### New Molecules

### File: `src/molecules/calculators/metrics-calculator.ts`

```typescript
export class MetricsCalculator {
  async calculateTeamMetrics(
    teamId: string,
    timeframe: TimeFrame
  ): Promise<{
    cycleTime: { average: number; median: number; trend: string };
    throughput: { issuesPerWeek: number; pointsPerWeek: number };
    qualityMetrics: {
      bugRatio: number; // 0-1
      reopenRate: number; // 0-1
      firstTimeResolve: number; // 0-1
    };
    workDistribution: {
      byType: Record<string, number>;
      byPriority: Record<string, number>;
      byAssignee: Record<string, number>;
    };
  }>

  async calculateProjectHealth(projectId: string): Promise<{
    completion: {
      percentage: number;
      estimatedCompletion: Date;
      confidence: number; // 0-1
    };
    velocity: {
      current: number;
      required: number;
      onTrack: boolean;
    };
    riskFactors: string[];
  }>
}
```

### File: `src/molecules/detectors/bottleneck-detector.ts`

```typescript
export class BottleneckDetector {
  async detectBottlenecks(teamId: string): Promise<{
    staleIssues: StaleIssue[];
    overloadedMembers: OverloadedMember[];
    blockedWork: BlockedWork[];
    processBottlenecks: ProcessBottleneck[];
  }>

  private async findStaleIssues(teamId: string): Promise<StaleIssue[]>
  private async identifyOverloadedMembers(teamId: string): Promise<OverloadedMember[]>  
  private async findBlockedWork(teamId: string): Promise<BlockedWork[]>
  private async analyzeProcessBottlenecks(teamId: string): Promise<ProcessBottleneck[]>
}

interface StaleIssue {
  issue: Issue;
  daysSinceUpdate: number;
  lastActivity: string;
  recommendation: string;
}

interface OverloadedMember {
  user: User;
  currentLoad: {
    issueCount: number;
    storyPoints: number;
    highPriorityCount: number;
  };
  capacityUtilization: number; // >1.0 indicates overload
  recommendation: string;
}

interface BlockedWork {
  issue: Issue;
  blockedBy: Issue | string; // Issue or external dependency
  daysSinceBlocked: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  suggestedActions: string[];
}
```

### File: `src/molecules/analyzers/project-health-analyzer.ts`

```typescript
export class ProjectHealthAnalyzer {
  async analyzeProjectHealth(projectId: string): Promise<{
    status: 'on-track' | 'at-risk' | 'off-track';
    healthScore: number; // 0-100
    completion: CompletionForecast;
    risks: ProjectRisk[];
    recommendations: string[];
    milestones: MilestoneStatus[];
  }>

  private assessOverallStatus(metrics: any): 'on-track' | 'at-risk' | 'off-track'
  private calculateHealthScore(metrics: any): number
  private identifyRisks(project: Project, issues: Issue[]): ProjectRisk[]
  private generateRecommendations(analysis: any): string[]
}
```

### Supporting Types

```typescript
export interface TeamDashboard {
  team: Team;
  activeWork: {
    totalIssues: number;
    totalPoints: number;
    byStatus: Record<string, { count: number; points: number }>;
    byAssignee: Record<string, { count: number; points: number }>;
    blockedIssues: Issue[];
    overdueIssues: Issue[];
  };
  recentActivity: {
    timeframe: string;
    completedIssues: Issue[];
    createdIssues: Issue[];
    commentsCount: number;
    averageResolutionTime: number;
  };
  healthMetrics: {
    velocityTrend: 'increasing' | 'stable' | 'decreasing';
    bugRatio: number;
    memberSatisfaction: number; // If available
    processEfficiency: number;
  };
  alerts: Alert[];
}

export interface Alert {
  type: 'warning' | 'info' | 'success';
  message: string;
  actionable: boolean;
  suggestedAction?: string;
}

export interface ProjectHealthReport {
  project: Project;
  status: 'on-track' | 'at-risk' | 'off-track';
  healthScore: number;
  completion: {
    percentage: number;
    estimatedDate: Date;
    confidence: number;
  };
  blockers: {
    critical: Issue[];
    dependencies: { blocker: Issue; blocked: Issue[] }[];
  };
  recommendations: string[];
  timeline: { milestone: string; status: string; date: Date }[];
}
```

## CLI Integration

```bash
# Team dashboard
linear team dashboard --team eng
linear team dashboard --team eng --timeframe this-month

# Project health
linear project health --project auth-system
linear project health --project proj-123 --detailed

# Bottleneck analysis
linear team bottlenecks --team eng
linear team bottlenecks --team eng --focus overload

# Performance metrics
linear team metrics --team eng --timeframe this-quarter
linear team metrics --team eng --compare-to last-quarter
```

## Reporting Features

### Dashboard Export
```typescript
// Export capabilities
async exportDashboard(
  teamKey: string, 
  format: 'json' | 'csv' | 'markdown'
): Promise<string>

// Schedule reports
async scheduleReport(config: {
  teamKey: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  format: string;
}): Promise<{ reportId: string }>
```

## Acceptance Criteria

- [ ] Comprehensive team dashboard with key metrics
- [ ] Project health analysis with risk assessment
- [ ] Bottleneck detection with actionable recommendations
- [ ] Performance trend analysis over time
- [ ] Configurable time frames (week, month, quarter)
- [ ] Export capabilities for reporting
- [ ] Real-time alerts for critical issues
- [ ] Performance: <3s for dashboard generation
- [ ] CLI with intuitive insights commands
- [ ] Unit tests for all calculation logic
- [ ] Mock data for testing when Linear API unavailable

## Dependencies

- All existing services (Team, Issue, Cycle, User)
- New metrics calculation logic
- Statistical analysis utilities
- Time-series data handling

## Notes

- Focus on actionable insights over vanity metrics
- Provide context for all metrics (trends, comparisons)
- Handle teams of different sizes and maturity levels  
- Support customizable time frames and filters
- Include confidence levels for predictions
- Protect sensitive team performance data
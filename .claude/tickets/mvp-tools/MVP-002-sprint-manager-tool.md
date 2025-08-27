# MVP-002: Implement SprintManager Tool

**Status**: `todo`  
**Priority**: `high`  
**Estimate**: L (5 points)  
**Labels**: `mvp`, `tool`, `sprint-management`  
**Team**: Engineering  

## Description

Implement the SprintManager tool for intelligent sprint planning, capacity management, and velocity tracking. Builds on existing SprintPlanningWorkflow with enhanced automation and insights.

## Implementation Details

### File: `src/organisms/tools/sprint-manager.tool.ts`

```typescript
export class SprintManagerTool {
  constructor(
    private cycleService: CycleService,
    private issueService: IssueService,
    private teamService: TeamService,
    private sprintWorkflow: SprintPlanningWorkflow,
    private velocityCalculator: VelocityCalculator
  ) {}

  async planSprint(options: SprintPlanOptions): Promise<SprintPlanResult>
  
  async autoAssignSprint(
    cycleId: string,
    strategy?: AssignmentStrategy
  ): Promise<AutoAssignResult>
  
  async getSprintHealth(cycleId: string): Promise<SprintHealthReport>
  
  async getTeamVelocity(
    teamKey: string,
    cycleCount?: number
  ): Promise<VelocityReport>
}
```

### New Molecules

### File: `src/molecules/calculators/velocity-calculator.ts`

```typescript
export class VelocityCalculator {
  constructor(private cycleService: CycleService) {}

  // Calculate team velocity over N cycles
  async calculateVelocity(
    teamId: string,
    cycleCount: number = 6
  ): Promise<{
    averageVelocity: number;
    velocityTrend: 'increasing' | 'decreasing' | 'stable';
    cycleData: { cycle: Cycle; velocity: number; capacity: number }[];
    confidence: number; // 0-1 based on data consistency
  }>

  // Forecast next sprint capacity
  async forecastCapacity(
    teamId: string,
    confidenceLevel: number = 0.8
  ): Promise<{
    recommendedCapacity: number;
    range: { min: number; max: number };
    confidence: number;
    reasoning: string[];
  }>
}
```

### File: `src/molecules/analyzers/sprint-health-analyzer.ts`

```typescript
export class SprintHealthAnalyzer {
  async analyzeSprintHealth(cycleId: string): Promise<{
    progress: ProgressMetrics;
    burndown: BurndownPoint[];
    risks: Risk[];
    recommendations: string[];
    healthScore: number; // 0-100
  }>

  private calculateRisks(cycle: Cycle, issues: Issue[]): Risk[]
  private generateRecommendations(analysis: any): string[]
  private calculateHealthScore(metrics: any): number
}

interface ProgressMetrics {
  completed: { count: number; points: number };
  inProgress: { count: number; points: number };
  todo: { count: number; points: number };
  blocked: { count: number; points: number };
  percentComplete: number;
  daysRemaining: number;
  velocityOnTrack: boolean;
}

interface Risk {
  type: 'scope-creep' | 'velocity-drop' | 'blocked-work' | 'capacity-issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  mitigation: string[];
}
```

### File: `src/molecules/planners/intelligent-sprint-planner.ts`

```typescript
export class IntelligentSprintPlanner {
  async planSprint(options: SprintPlanOptions): Promise<{
    cycle: Cycle;
    recommendedIssues: Issue[];
    capacityAnalysis: CapacityAnalysis;
    alternativeOptions: AlternativePlan[];
  }>

  private async selectOptimalIssues(
    availableIssues: Issue[],
    capacity: number,
    constraints: PlanConstraints
  ): Promise<Issue[]>

  private async calculateCapacityUtilization(
    issues: Issue[],
    teamCapacity: number
  ): Promise<CapacityAnalysis>
}
```

### Supporting Types

```typescript
export interface SprintPlanOptions {
  teamKey: string;
  sprintGoal: string;
  capacity?: number; // If not provided, calculate from velocity
  duration?: number; // Days, default from team settings
  startDate?: Date; // Default to next Monday
  priorityFilter?: IssuePriority[];
  includeLabels?: string[];
  excludeLabels?: string[];
}

export interface SprintPlanResult {
  cycle: Cycle;
  recommendedIssues: Issue[];
  capacityAnalysis: CapacityAnalysis;
  warnings: string[];
  alternativeOptions?: AlternativePlan[];
}

export interface CapacityAnalysis {
  totalPoints: number;
  teamCapacity: number;
  utilization: number; // 0-1
  recommendation: 'under-planned' | 'optimal' | 'over-planned';
  confidence: number;
  reasoning: string[];
}
```

## CLI Integration

```bash
# Sprint planning
linear sprint plan --team eng --goal "Auth system refactor" --capacity 35
linear sprint plan --team eng --auto-capacity --duration 10

# Auto-assignment
linear sprint assign --current --strategy balanced
linear sprint assign --cycle sprint-123 --strategy expertise

# Health monitoring
linear sprint health --current --team eng
linear sprint health --cycle sprint-123 --detailed

# Velocity tracking
linear velocity --team eng --cycles 6
linear velocity --team eng --forecast
```

## Enhanced Workflow Integration

Extend existing `SprintPlanningWorkflow`:

```typescript
// In src/molecules/workflows/sprint-planning.workflow.ts
export class SprintPlanningWorkflow {
  // Add intelligent planning capabilities
  async createIntelligentSprint(options: IntelligentSprintOptions): Promise<SprintResult>
  
  // Add capacity-aware planning
  async planWithCapacity(options: CapacityPlanOptions): Promise<SprintResult>
  
  // Add auto-assignment logic
  async autoAssignBasedOnWorkload(cycleId: string): Promise<AssignmentResult>
}
```

## Acceptance Criteria

- [ ] Intelligent sprint planning with capacity analysis
- [ ] Auto-assignment based on team workload and expertise
- [ ] Real-time sprint health monitoring with risk detection
- [ ] Velocity calculation and forecasting
- [ ] Burndown chart generation
- [ ] Smart recommendations for sprint optimization
- [ ] Integration with existing SprintPlanningWorkflow
- [ ] Performance: <2s for planning operations
- [ ] CLI with intuitive sprint management commands
- [ ] Unit tests for all calculation logic
- [ ] Integration tests with mock data

## Dependencies

- Enhanced SprintPlanningWorkflow
- Existing CycleService, IssueService, TeamService
- New velocity calculation logic
- Sprint health analysis algorithms

## Notes

- Focus on actionable insights over raw metrics
- Provide confidence levels for all predictions
- Handle edge cases (no historical data, incomplete sprints)
- Support different team sizes and working styles
- Include reasoning for all recommendations
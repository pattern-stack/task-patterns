# LIN-001: Implement CycleService

**Status**: `done` ✅  
**Priority**: `high`  
**Estimate**: M (3 points)  
**Labels**: `feature`, `service`, `cycles`  
**Team**: Engineering  

## Description

Create a comprehensive CycleService to manage Linear cycles (sprints/iterations). Cycles are time-boxed periods for organizing work.

**TDD Approach**: Write tests first, then implement functionality to make tests pass.

## Test-First Development

### Step 1: Write Tests First

**File: `src/__tests__/features/cycle.service.test.ts`**

```typescript
import { CycleService } from '@features/cycle/service';
import { createMockLinearClient } from '../utils/mocks';
import { NotFoundError, ValidationError } from '@atoms/types/common';

describe('CycleService', () => {
  let service: CycleService;
  let mockClient: any;
  
  beforeEach(() => {
    mockClient = createMockLinearClient();
    service = new CycleService();
  });
  
  describe('create', () => {
    it('should create a new cycle with valid data', async () => {
      const cycleData = {
        name: 'Sprint 1',
        teamId: 'team-123',
        startsAt: '2024-01-01T00:00:00Z',
        endsAt: '2024-01-14T00:00:00Z',
      };
      
      mockClient.createCycle.mockResolvedValue({
        success: true,
        cycle: { id: 'cycle-123', ...cycleData },
      });
      
      const cycle = await service.create(cycleData);
      
      expect(cycle.id).toBe('cycle-123');
      expect(cycle.name).toBe('Sprint 1');
      expect(mockClient.createCycle).toHaveBeenCalledWith(cycleData);
    });
    
    it('should throw ValidationError for overlapping cycles', async () => {
      // Test overlap detection
      mockClient.cycles.mockResolvedValue({
        nodes: [{
          startsAt: '2024-01-10T00:00:00Z',
          endsAt: '2024-01-24T00:00:00Z',
        }],
      });
      
      const cycleData = {
        name: 'Sprint 2',
        teamId: 'team-123',
        startsAt: '2024-01-12T00:00:00Z',
        endsAt: '2024-01-26T00:00:00Z',
      };
      
      await expect(service.create(cycleData))
        .rejects.toThrow(ValidationError);
    });
  });
  
  describe('getActive', () => {
    it('should return the currently active cycle', async () => {
      const now = new Date();
      const activeCycle = {
        id: 'cycle-active',
        startsAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        endsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      };
      
      mockClient.cycles.mockResolvedValue({
        nodes: [activeCycle],
      });
      
      const result = await service.getActive('team-123');
      
      expect(result?.id).toBe('cycle-active');
    });
    
    it('should return null when no active cycle exists', async () => {
      mockClient.cycles.mockResolvedValue({ nodes: [] });
      
      const result = await service.getActive('team-123');
      
      expect(result).toBeNull();
    });
  });
  
  describe('getProgress', () => {
    it('should calculate cycle progress correctly', async () => {
      mockClient.cycle.mockResolvedValue({
        id: 'cycle-123',
        issues: { nodes: [
          { completedAt: '2024-01-05T00:00:00Z', estimate: 3 },
          { completedAt: null, estimate: 5 },
          { completedAt: '2024-01-06T00:00:00Z', estimate: 2 },
        ]},
      });
      
      const progress = await service.getProgress('cycle-123');
      
      expect(progress.completedPoints).toBe(5);
      expect(progress.totalPoints).toBe(10);
      expect(progress.percentComplete).toBe(50);
    });
  });
});
```

### Step 2: Implementation Details

### File: `src/features/cycle/service.ts`

```typescript
export class CycleService {
  // CRUD operations
  async create(data: CycleCreate): Promise<Cycle>
  async get(id: string): Promise<Cycle | null>
  async update(id: string, data: CycleUpdate): Promise<Cycle>
  async archive(id: string): Promise<boolean>
  async list(pagination?: Pagination): Promise<CycleConnection>
  
  // Cycle-specific operations
  async getActive(teamId: string): Promise<Cycle | null>
  async getUpcoming(teamId: string): Promise<CycleConnection>
  async getCompleted(teamId: string): Promise<CycleConnection>
  
  // Related data
  async getIssues(cycleId: string, filter?: IssueFilter): Promise<IssueConnection>
  async addIssue(cycleId: string, issueId: string): Promise<Issue>
  async removeIssue(cycleId: string, issueId: string): Promise<Issue>
  
  // Analytics
  async getProgress(cycleId: string): Promise<CycleProgress>
  async getVelocity(cycleId: string): Promise<number>
}
```

### Schemas

```typescript
export const CycleCreateSchema = z.object({
  name: z.string().min(1),
  teamId: z.string(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  description: z.string().optional(),
});

export const CycleUpdateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});
```

## Acceptance Criteria

- [ ] **Tests written first** before any implementation
- [ ] All tests failing initially (Red phase)
- [ ] Implementation makes tests pass (Green phase)
- [ ] Code refactored while tests still pass (Refactor phase)
- [ ] All CRUD operations functional
- [ ] Cycle filtering by state (active, upcoming, completed)
- [ ] Issue management within cycles
- [ ] Progress calculation returns completion percentage
- [ ] Unit tests with >80% coverage
- [ ] Integration with TeamService for team-specific cycles
- [ ] Error handling for overlapping cycles

## TDD Workflow

1. **Red**: Write failing tests for each method
2. **Green**: Write minimal code to make tests pass
3. **Refactor**: Improve code quality while maintaining green tests
4. **Repeat**: For each new feature or edge case

## Dependencies

- Linear SDK `@linear/sdk` Cycle model
- TeamService (for validation)
- IssueService (for issue operations)

## Notes

- Cycles cannot overlap within a team
- Only one cycle can be active per team at a time
- Completed cycles cannot be modified
# LIN-017: Add Comprehensive Integration Tests

**Status**: `todo`  
**Priority**: `medium`  
**Estimate**: L (5 points)  
**Labels**: `technical-debt`, `testing`, `quality`  
**Team**: Engineering  

## Description

Create comprehensive integration tests covering end-to-end scenarios, error conditions, and performance benchmarks.

## Implementation Details

### File: `src/__tests__/integration/workflows/issue-lifecycle.test.ts`

```typescript
describe('Issue Lifecycle Integration', () => {
  let issueEntity: IssueEntity;
  let teamService: TeamService;
  let testTeam: Team;
  let testIssue: Issue;
  
  beforeAll(async () => {
    // Setup test environment
    await setupTestDatabase();
    await mockLinearAPI();
  });
  
  describe('Complete Issue Workflow', () => {
    it('should handle full issue lifecycle', async () => {
      // Create issue
      testIssue = await issueEntity.create({
        title: 'Integration test issue',
        teamId: testTeam.id,
        description: 'Test description',
      });
      expect(testIssue).toBeDefined();
      
      // Add comments
      const comment = await commentService.create({
        issueId: testIssue.id,
        body: 'Test comment',
      });
      expect(comment).toBeDefined();
      
      // Add labels
      await labelService.addToIssue(testIssue.id, 'bug');
      
      // Move through workflow states
      const states = await workflowStateService.listByTeam(testTeam.id);
      for (const state of states.nodes) {
        await issueService.update(testIssue.id, { stateId: state.id });
        // Verify state transition
      }
      
      // Archive issue
      await issueEntity.archive(testIssue.id);
      const archived = await issueEntity.get(testIssue.id);
      expect(archived?.archivedAt).toBeDefined();
    });
  });
});
```

### File: `src/__tests__/integration/performance/load-test.ts`

```typescript
describe('Performance Tests', () => {
  describe('Bulk Operations', () => {
    it('should handle 1000 concurrent issue creations', async () => {
      const startTime = Date.now();
      const promises = Array.from({ length: 1000 }, (_, i) => 
        issueService.create({
          title: `Perf test issue ${i}`,
          teamId: testTeam.id,
        })
      );
      
      const results = await Promise.allSettled(promises);
      const endTime = Date.now();
      
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');
      
      expect(successful.length).toBeGreaterThan(950); // Allow some failures
      expect(endTime - startTime).toBeLessThan(30000); // 30 seconds max
      
      // Analyze failures
      const failureReasons = failed.map(r => (r as PromiseRejectedResult).reason);
      console.log('Failure analysis:', analyzeFailures(failureReasons));
    });
    
    it('should efficiently paginate through large datasets', async () => {
      const measurePagination = new PerformanceMeasure('pagination');
      
      let allIssues: Issue[] = [];
      let cursor: string | undefined;
      let pageCount = 0;
      
      measurePagination.start();
      
      do {
        const page = await issueService.list({
          first: 100,
          after: cursor,
        });
        
        allIssues = allIssues.concat(page.nodes);
        cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : undefined;
        pageCount++;
        
        // Ensure we're not in an infinite loop
        expect(pageCount).toBeLessThan(100);
      } while (cursor);
      
      measurePagination.end();
      
      expect(measurePagination.duration).toBeLessThan(5000);
      expect(allIssues.length).toBeGreaterThan(0);
    });
  });
});
```

### File: `src/__tests__/integration/error-scenarios/error-handling.test.ts`

```typescript
describe('Error Handling Integration', () => {
  describe('Rate Limiting', () => {
    it('should handle and recover from rate limits', async () => {
      // Simulate rate limit
      mockLinearAPI.setRateLimit(true);
      
      const results: any[] = [];
      const errors: any[] = [];
      
      // Make multiple requests
      for (let i = 0; i < 10; i++) {
        try {
          const issue = await issueService.create({
            title: `Rate limit test ${i}`,
            teamId: testTeam.id,
          });
          results.push(issue);
        } catch (error) {
          errors.push(error);
        }
      }
      
      // Should have some successes after retry
      expect(results.length).toBeGreaterThan(0);
      
      // Should have rate limit errors
      const rateLimitErrors = errors.filter(e => e instanceof RateLimitError);
      expect(rateLimitErrors.length).toBeGreaterThan(0);
      
      // Verify retry-after header was respected
      for (const error of rateLimitErrors) {
        expect(error.retryAfter).toBeGreaterThan(0);
      }
    });
  });
  
  describe('Network Failures', () => {
    it('should retry on network failures', async () => {
      let attemptCount = 0;
      
      mockLinearAPI.onRequest(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new NetworkError('Connection refused');
        }
        return mockIssueResponse();
      });
      
      const issue = await issueService.create({
        title: 'Network retry test',
        teamId: testTeam.id,
      });
      
      expect(issue).toBeDefined();
      expect(attemptCount).toBe(3);
    });
  });
});
```

### File: `src/__tests__/integration/cli/cli-commands.test.ts`

```typescript
describe('CLI Integration Tests', () => {
  describe('Issue Commands', () => {
    it('should create issue via CLI', async () => {
      const result = await runCLI([
        'issue', 'create',
        '--title', 'CLI test issue',
        '--team', testTeam.id,
        '--priority', '2',
      ]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Issue created');
      expect(result.stdout).toContain('CLI-');
    });
    
    it('should handle invalid inputs gracefully', async () => {
      const result = await runCLI([
        'issue', 'create',
        '--team', 'invalid-team-id',
      ]);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Team not found');
    });
  });
});
```

### File: `src/__tests__/integration/webhooks/webhook-handling.test.ts`

```typescript
describe('Webhook Integration', () => {
  let webhookServer: Express;
  let webhookPort: number;
  
  beforeAll(async () => {
    webhookServer = createWebhookServer();
    webhookPort = await startServer(webhookServer);
  });
  
  it('should receive and process webhook events', async () => {
    const receivedEvents: any[] = [];
    
    webhookServer.post('/webhook', (req, res) => {
      receivedEvents.push(req.body);
      res.sendStatus(200);
    });
    
    // Create webhook
    const webhook = await webhookService.create({
      url: `http://localhost:${webhookPort}/webhook`,
      resourceTypes: ['Issue', 'Comment'],
      teamId: testTeam.id,
    });
    
    // Trigger events
    const issue = await issueService.create({
      title: 'Webhook test',
      teamId: testTeam.id,
    });
    
    // Wait for webhook delivery
    await waitFor(() => receivedEvents.length > 0, 5000);
    
    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0].type).toBe('Issue');
    expect(receivedEvents[0].action).toBe('create');
  });
});
```

### Test Utilities

```typescript
// src/__tests__/integration/utils/performance.ts
export class PerformanceMeasure {
  private startTime?: number;
  public duration?: number;
  
  constructor(public name: string) {}
  
  start(): void {
    this.startTime = performance.now();
  }
  
  end(): void {
    if (!this.startTime) throw new Error('Must call start() first');
    this.duration = performance.now() - this.startTime;
  }
}

// src/__tests__/integration/utils/mock-linear-api.ts
export class MockLinearAPI {
  private rateLimited = false;
  private requestHandlers = new Map<string, Function>();
  
  setRateLimit(limited: boolean): void {
    this.rateLimited = limited;
  }
  
  onRequest(handler: Function): void {
    // Register request handler
  }
  
  reset(): void {
    this.rateLimited = false;
    this.requestHandlers.clear();
  }
}
```

## Acceptance Criteria

- [ ] End-to-end workflow tests
- [ ] Performance benchmarks for bulk operations
- [ ] Rate limit handling verification
- [ ] Network failure recovery tests
- [ ] CLI command integration tests
- [ ] Webhook delivery tests
- [ ] Error scenario coverage
- [ ] Test data factories
- [ ] Performance measurement utilities
- [ ] CI/CD integration
- [ ] Test report generation

## Dependencies

- Jest for test framework
- Supertest for HTTP testing
- Mock server for Linear API
- Performance API for measurements

## Notes

- Run integration tests separately from unit tests
- Use test database/environment
- Clean up test data after runs
- Monitor test execution time
- Generate coverage reports
# LIN-009: Implement WebhookService

**Status**: `todo`  
**Priority**: `high`  
**Estimate**: L (5 points)  
**Labels**: `feature`, `service`, `integration`, `real-time`  
**Team**: Engineering  

## Description

Implement WebhookService for managing Linear webhooks, enabling real-time event notifications and integrations.

## Implementation Details

### File: `src/features/webhook/service.ts`

```typescript
export class WebhookService {
  // CRUD operations
  async create(data: WebhookCreate): Promise<Webhook>
  async update(id: string, data: WebhookUpdate): Promise<Webhook>
  async delete(id: string): Promise<boolean>
  async get(id: string): Promise<Webhook | null>
  async list(filter?: WebhookFilter): Promise<WebhookConnection>
  
  // Management
  async enable(id: string): Promise<Webhook>
  async disable(id: string): Promise<Webhook>
  async testWebhook(id: string): Promise<WebhookTestResult>
  
  // Team/Org webhooks
  async listByTeam(teamId: string): Promise<WebhookConnection>
  async createOrgWebhook(data: OrgWebhookCreate): Promise<Webhook>
  
  // Webhook handling
  async verifySignature(payload: string, signature: string, timestamp: number): boolean
  async handleWebhook(payload: WebhookPayload): Promise<void>
  
  // Event filtering
  async getResourceTypes(): Promise<string[]>
  async updateResourceTypes(id: string, resourceTypes: string[]): Promise<Webhook>
}
```

### File: `src/features/webhook/handler.ts`

```typescript
export class WebhookHandler {
  private handlers: Map<string, WebhookEventHandler> = new Map();
  
  register(eventType: string, handler: WebhookEventHandler): void
  async process(payload: WebhookPayload): Promise<void>
  
  // Built-in handlers
  async handleIssueCreate(data: IssueWebhookData): Promise<void>
  async handleIssueUpdate(data: IssueWebhookData, updatedFrom: any): Promise<void>
  async handleCommentCreate(data: CommentWebhookData): Promise<void>
  async handleIssueSLA(data: IssueSLAWebhookData): Promise<void>
}
```

### Schemas

```typescript
export const WebhookCreateSchema = z.object({
  url: z.string().url(),
  teamId: z.string().optional(),
  allPublicTeams: z.boolean().optional(),
  resourceTypes: z.array(z.enum([
    'Issue', 'Comment', 'IssueLabel', 'Project', 
    'Cycle', 'Reaction', 'User', 'Team'
  ])),
  secret: z.string().optional(),
  label: z.string().optional(),
});

export interface WebhookPayload {
  action: 'create' | 'update' | 'remove' | string;
  type: string;
  data: any;
  url: string;
  createdAt: string;
  organizationId: string;
  webhookTimestamp: number;
  webhookId: string;
  updatedFrom?: any;
}
```

### Verification Utility

```typescript
import { createHmac, timingSafeEqual } from 'crypto';

export class WebhookVerifier {
  constructor(private secret: string) {}
  
  verify(payload: string, signature: string, timestamp: number): boolean {
    // Prevent replay attacks
    if (Math.abs(Date.now() - timestamp) > 60 * 1000) {
      return false;
    }
    
    const computed = createHmac('sha256', this.secret)
      .update(payload)
      .digest('hex');
    
    return timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(computed, 'hex')
    );
  }
}
```

## Acceptance Criteria

- [ ] CRUD operations for webhooks
- [ ] Signature verification with HMAC-SHA256
- [ ] Replay attack prevention (60s window)
- [ ] Support team and organization webhooks
- [ ] Resource type filtering
- [ ] Webhook testing functionality
- [ ] Event handler registration system
- [ ] Built-in handlers for common events
- [ ] Error handling and retry logic
- [ ] Unit tests with webhook mocking
- [ ] Integration test with Express server

## Dependencies

- Linear SDK Webhook model
- Node.js crypto for signatures
- Express.js for webhook endpoint
- Event emitter pattern

## Notes

- Webhooks have 5000ms timeout
- Failed webhooks are retried by Linear
- Support both team-specific and org-wide webhooks
- Custom headers: Linear-Delivery, Linear-Event, Linear-Signature
- Webhooks can filter by resource types
# LIN-011: Create NotificationService

**Status**: `todo`  
**Priority**: `medium`  
**Estimate**: M (3 points)  
**Labels**: `feature`, `service`, `notifications`  
**Team**: Engineering  

## Description

Implement NotificationService for managing Linear notifications, including app notifications, user mentions, and notification preferences.

## Implementation Details

### File: `src/features/notification/service.ts`

```typescript
export class NotificationService {
  // Notification retrieval
  async get(id: string): Promise<Notification | null>
  async list(filter?: NotificationFilter, pagination?: Pagination): Promise<NotificationConnection>
  async listUnread(userId?: string): Promise<NotificationConnection>
  async listByType(type: NotificationType): Promise<NotificationConnection>
  
  // Notification management
  async markAsRead(id: string): Promise<Notification>
  async markAllAsRead(userId?: string): Promise<BatchResult>
  async archive(id: string): Promise<Notification>
  async snooze(id: string, until: Date): Promise<Notification>
  
  // Subscription management
  async getSubscriptions(userId?: string): Promise<NotificationSubscriptionConnection>
  async subscribe(entityId: string, type: EntityType): Promise<NotificationSubscription>
  async unsubscribe(subscriptionId: string): Promise<boolean>
  
  // Preferences
  async getPreferences(userId?: string): Promise<NotificationPreferences>
  async updatePreferences(preferences: NotificationPreferencesUpdate): Promise<NotificationPreferences>
}
```

### File: `src/features/notification/types.ts`

```typescript
export enum NotificationType {
  IssueAssignedToYou = 'issueAssignedToYou',
  IssueUnassignedFromYou = 'issueUnassignedFromYou',
  IssueMention = 'issueMention',
  IssueCommentMention = 'issueCommentMention',
  IssueStatusChanged = 'issueStatusChanged',
  IssueNewComment = 'issueNewComment',
  IssueEmojiReaction = 'issueEmojiReaction',
  IssueCommentReaction = 'issueCommentReaction',
  ProjectUpdate = 'projectUpdate',
  IssueDue = 'issueDue',
  IssueSLA = 'issueSLA',
}

export interface NotificationPreferences {
  email: {
    enabled: boolean;
    frequency: 'instant' | 'daily' | 'weekly';
    types: NotificationType[];
  };
  inApp: {
    enabled: boolean;
    types: NotificationType[];
  };
  slack: {
    enabled: boolean;
    channelId?: string;
    types: NotificationType[];
  };
}
```

### Entity for Notification Management

```typescript
// src/molecules/entities/notification.entity.ts
export class NotificationEntity {
  private notificationService: NotificationService;
  private userService: UserService;
  private issueService: IssueService;
  
  // Smart notification grouping
  async getGroupedNotifications(userId?: string): Promise<GroupedNotifications> {
    const notifications = await this.notificationService.listUnread(userId);
    return this.groupByContext(notifications);
  }
  
  // Notification actions
  async handleNotificationAction(
    notificationId: string, 
    action: 'view' | 'snooze' | 'dismiss'
  ): Promise<void>
  
  // Batch operations
  async markContextAsRead(contextType: string, contextId: string): Promise<void>
  async clearNotificationsOlderThan(days: number): Promise<number>
  
  // Smart subscriptions
  async autoSubscribe(userId: string, rules: SubscriptionRules): Promise<void>
  async getRecommendedSubscriptions(userId: string): Promise<EntitySubscription[]>
}
```

### Schemas

```typescript
export const NotificationFilterSchema = z.object({
  type: z.nativeEnum(NotificationType).optional(),
  readAt: z.object({
    null: z.boolean().optional(),
  }).optional(),
  archivedAt: z.object({
    null: z.boolean().optional(),
  }).optional(),
  user: z.object({
    id: z.string().optional(),
  }).optional(),
  createdAt: z.object({
    gte: z.string().datetime().optional(),
    lte: z.string().datetime().optional(),
  }).optional(),
});

export const NotificationPreferencesUpdateSchema = z.object({
  email: z.object({
    enabled: z.boolean().optional(),
    frequency: z.enum(['instant', 'daily', 'weekly']).optional(),
    types: z.array(z.nativeEnum(NotificationType)).optional(),
  }).optional(),
  inApp: z.object({
    enabled: z.boolean().optional(),
    types: z.array(z.nativeEnum(NotificationType)).optional(),
  }).optional(),
});
```

## Acceptance Criteria

- [ ] List and filter notifications
- [ ] Mark notifications as read/unread
- [ ] Archive and snooze notifications
- [ ] Manage notification subscriptions
- [ ] Update notification preferences
- [ ] Group notifications by context
- [ ] Auto-subscription based on rules
- [ ] Batch operations for efficiency
- [ ] Unit tests with mocked data
- [ ] Integration with webhook events

## Dependencies

- Linear SDK Notification model
- UserService (for user context)
- IssueService (for issue context)
- WebhookService (for real-time updates)

## Notes

- Notifications are user-specific
- Support for email, in-app, and Slack channels
- Can subscribe to specific entities
- Preferences control delivery methods
- Consider notification fatigue in design
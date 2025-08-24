import { z } from 'zod';

export const UserUpdateSchema = z.object({
  displayName: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  timezone: z.string().optional(),
  statusEmoji: z.string().optional(),
  statusLabel: z.string().optional(),
  statusUntilAt: z.string().datetime().optional(),
});

export type UserUpdate = z.infer<typeof UserUpdateSchema>;

export const UserFilterSchema = z.object({
  active: z.boolean().optional(),
  admin: z.boolean().optional(),
  teamId: z.string().optional(),
  email: z
    .object({
      eq: z.string().email().optional(),
      contains: z.string().optional(),
    })
    .optional(),
});

export type UserFilter = z.infer<typeof UserFilterSchema>;

export const UserSettingsUpdateSchema = z.object({
  timezone: z.string().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  notificationPreferences: z
    .object({
      email: z.boolean().optional(),
      slack: z.boolean().optional(),
      push: z.boolean().optional(),
    })
    .optional(),
});

export type UserSettingsUpdate = z.infer<typeof UserSettingsUpdateSchema>;

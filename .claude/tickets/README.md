# Linear Agent Development Tickets

This directory contains our development tickets organized by milestone. Each ticket follows Linear's structure with status, priority, estimate, and labels.

## Structure

```
tickets/
├── mvp1-core/          # Core Linear operations (Week 1) - 5 remaining
├── mvp2-collaboration/ # Team collaboration features (Week 2) - 4 tickets
├── technical-debt/     # Infrastructure and improvements - 3 tickets
├── completed/          # Done tickets - 3 completed ✅
└── backlog/           # Future enhancements
```

## Progress Summary

**Completed (3 tickets - 7 story points):**
- ✅ LIN-001: CycleService (M-3pts) - Sprint/iteration management
- ✅ LIN-002: CommentService (S-2pts) - Issue discussions & reactions  
- ✅ LIN-003: LabelService (S-2pts) - Categorization system

**Next Up (MVP1 remaining):**
- 🔄 LIN-004: UserService (M-3pts) - Team member management
- 🔄 LIN-005: Complete TeamService CRUD (S-2pts)
- 🔄 LIN-006: AttachmentService (M-3pts) - File uploads
- 🔄 LIN-007: CLI Commands (L-5pts) - User interface
- 🔄 LIN-008: WorkflowStateService (S-2pts) - Status workflows

## Ticket Format

Each ticket includes:
- **Status**: `todo` | `in_progress` | `done` | `blocked`
- **Priority**: `urgent` | `high` | `medium` | `low`
- **Estimate**: XS (1), S (2), M (3), L (5), XL (8)
- **Labels**: Feature area tags
- **Assignee**: Developer responsible
- **Description**: Implementation details
- **Acceptance Criteria**: Definition of done

## Current Sprint: MVP 1 - Core Operations

Focus on completing CRUD operations for all primary Linear objects.
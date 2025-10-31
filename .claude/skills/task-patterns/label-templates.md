# Label Templates and Structures

## Overview

This document provides common label structures and templates for organizing Linear issues. Use these as starting points for team label organization.

## Standard Label Groups

### Group 1: Issue Type (Mutually Exclusive)

Represents the scope/size of work:

| Label | Color | Description | When to Use |
|-------|-------|-------------|-------------|
| Epic | `#8B5CF6` (Purple) | Large, multi-step bodies of work | Multi-sprint initiatives, major features |
| Story | `#3B82F6` (Blue) | Complete user-facing features | Single-sprint features, user stories |
| Task | `#10B981` (Green) | Individual implementation work | Usually a single commit, clear deliverable |
| Subtask | `#6B7280` (Gray) | Part of an implementation step | Granular work items within tasks |

**Usage:**
```bash
tp labels create "Epic" -c "#8B5CF6" -d "Large, multi-step bodies of work"
tp labels create "Story" -c "#3B82F6" -d "Complete user-facing features, can be part of an epic"
tp labels create "Task" -c "#10B981" -d "Individual implementation work, usually a commit"
tp labels create "Subtask" -c "#6B7280" -d "A part of an implementation step"
```

### Group 2: Stack (Mutually Exclusive, REQUIRED)

Represents the technical layer:

| Label | Color | Description | When to Use |
|-------|-------|-------------|-------------|
| Backend | `#EF4444` (Red) | Backend work | Python, FastAPI, database, API endpoints |
| Frontend | `#F59E0B` (Orange) | Frontend work | React, TypeScript, UI components |
| Full Stack | `#EC4899` (Pink) | Cross-stack work | Features spanning both layers |

**Usage:**
```bash
tp labels create "Backend" -c "#EF4444" -d "Python backend work (FastAPI, SQLAlchemy, services)"
tp labels create "Frontend" -c "#F59E0B" -d "React frontend work (TypeScript, components, UI)"
tp labels create "Full Stack" -c "#EC4899" -d "Work spanning both backend and frontend"
```

### Group 3: Work Type (Mutually Exclusive)

Represents the nature of work:

| Label | Color | Description | When to Use |
|-------|-------|-------------|-------------|
| Infrastructure | `#6366F1` (Indigo) | Setup and tooling | Docker, CI/CD, database config, deployment |
| Tooling | `#8B5CF6` (Purple) | Development tools | Scripts, automation, dev experience |
| Architecture | `#14B8A6` (Teal) | Design and planning | Architecture decisions, technical design |
| Documentation | `#A78BFA` (Light Purple) | Documentation | README, guides, API docs |
| Feature Dev | `#10B981` (Green) | New features | Implementing new functionality |
| Bugfix | `#DC2626` (Dark Red) | Bug fixes | Fixing defects, corrections |

**Usage:**
```bash
tp labels create "Infrastructure" -c "#6366F1" -d "Setup, tooling, Docker, CI/CD, database config"
tp labels create "Tooling" -c "#8B5CF6" -d "Development tools, scripts, automation"
tp labels create "Architecture" -c "#14B8A6" -d "Design, planning, architecture decisions"
tp labels create "Documentation" -c "#A78BFA" -d "README, guides, architecture docs"
tp labels create "Feature Dev" -c "#10B981" -d "New feature implementation"
tp labels create "Bugfix" -c "#DC2626" -d "Bug fixes and corrections"
```

### Group 4: Domain (Multiple Allowed, Optional)

Represents project-specific functional areas:

| Label | Color | Description | Example Domains |
|-------|-------|-------------|-----------------|
| Accounts | `#3B82F6` (Blue) | Account/company management | For CRM-style apps |
| Activities | `#8B5CF6` (Purple) | Activity feed and events | For activity tracking |
| Deals | `#10B981` (Green) | Deal pipeline | For sales/pipeline apps |
| Users | `#F59E0B` (Orange) | User management | For auth/user features |
| AI | `#EC4899` (Pink) | AI features | For LLM integration |
| Search | `#14B8A6` (Teal) | Search functionality | For search features |

**Usage:**
```bash
tp labels create "Accounts" -c "#3B82F6" -d "Account/company management features"
tp labels create "Activities" -c "#8B5CF6" -d "Activity feed and event tracking"
tp labels create "Deals" -c "#10B981" -d "Deal pipeline and stage management"
tp labels create "Users" -c "#F59E0B" -d "User management and authentication"
tp labels create "ai" -c "#EC4899" -d "AI features and LLM integration"
tp labels create "Search" -c "#14B8A6" -d "Search functionality (semantic, full-text)"
```

## Hierarchical Label Structures

For more granular organization, use hierarchical labels with `category:value` format:

### Type Hierarchy

```bash
tp labels create "type:feature" -c "#16a34a" -d "New functionality"
tp labels create "type:bug" -c "#dc2626" -d "Defects and issues"
tp labels create "type:refactor" -c "#8b5cf6" -d "Code improvements"
tp labels create "type:docs" -c "#0ea5e9" -d "Documentation"
tp labels create "type:test" -c "#f59e0b" -d "Testing"
tp labels create "type:chore" -c "#6b7280" -d "Maintenance tasks"
```

### Stack Hierarchy

```bash
tp labels create "stack:backend" -c "#ef4444" -d "Backend-only work"
tp labels create "stack:frontend" -c "#f59e0b" -d "Frontend-only work"
tp labels create "stack:fullstack" -c "#ec4899" -d "Full-stack work"
tp labels create "stack:mobile" -c "#8b5cf6" -d "Mobile app work"
```

### Priority Hierarchy

```bash
tp labels create "priority:p0" -c "#dc2626" -d "Critical/Urgent"
tp labels create "priority:p1" -c "#f59e0b" -d "High priority"
tp labels create "priority:p2" -c "#3b82f6" -d "Medium priority"
tp labels create "priority:p3" -c "#6b7280" -d "Low priority"
```

### Layer Hierarchy (Atomic Architecture)

```bash
tp labels create "layer:atoms" -c "#00b894" -d "Foundation layer"
tp labels create "layer:features" -c "#00b894" -d "Data services"
tp labels create "layer:molecules" -c "#00b894" -d "Domain logic"
tp labels create "layer:organisms" -c "#00b894" -d "User interfaces"
```

## Complete Label Setup Scripts

### Minimal Setup (4 Groups, 16 Labels)

```bash
# Issue Type
tp labels create "Epic" -c "#8B5CF6" -d "Large, multi-step bodies of work"
tp labels create "Story" -c "#3B82F6" -d "Complete user-facing features"
tp labels create "Task" -c "#10B981" -d "Individual implementation work"
tp labels create "Subtask" -c "#6B7280" -d "Part of an implementation step"

# Stack
tp labels create "Backend" -c "#EF4444" -d "Backend work"
tp labels create "Frontend" -c "#F59E0B" -d "Frontend work"
tp labels create "Full Stack" -c "#EC4899" -d "Full-stack work"

# Work Type
tp labels create "Feature Dev" -c "#10B981" -d "New features"
tp labels create "Bugfix" -c "#DC2626" -d "Bug fixes"
tp labels create "Infrastructure" -c "#6366F1" -d "Infrastructure and tooling"

# Domain (example for web app)
tp labels create "Auth" -c "#3B82F6" -d "Authentication and authorization"
tp labels create "API" -c "#8B5CF6" -d "API endpoints and integration"
tp labels create "UI" -c "#F59E0B" -d "User interface components"
tp labels create "Database" -c "#10B981" -d "Database schema and queries"
tp labels create "Testing" -c "#14B8A6" -d "Test coverage and quality"
tp labels create "Docs" -c "#A78BFA" -d "Documentation"
```

### Hierarchical Setup (Atomic Architecture Project)

```bash
# Type hierarchy
tp labels create "type:feature" -c "#16a34a" -d "New functionality"
tp labels create "type:bug" -c "#dc2626" -d "Defects and issues"
tp labels create "type:refactor" -c "#8b5cf6" -d "Code improvements"
tp labels create "type:docs" -c "#0ea5e9" -d "Documentation"

# Layer hierarchy
tp labels create "layer:atoms" -c "#00b894" -d "Foundation layer"
tp labels create "layer:features" -c "#00b894" -d "Data services"
tp labels create "layer:molecules" -c "#00b894" -d "Domain logic"
tp labels create "layer:organisms" -c "#00b894" -d "User interfaces"

# Domain hierarchy
tp labels create "domain:tasks" -c "#14b8a6" -d "Task management"
tp labels create "domain:teams" -c "#14b8a6" -d "Team operations"
tp labels create "domain:labels" -c "#14b8a6" -d "Label management"
tp labels create "domain:projects" -c "#14b8a6" -d "Project features"
```

## Updating Existing Labels

If you need to update colors or descriptions for an existing label structure:

```bash
# Switch to the team context
tp config teams MYTEAM

# Update Issue Type group
tp labels update "Epic" -c "#8B5CF6" -d "Large, multi-step bodies of work"
tp labels update "Story" -c "#3B82F6" -d "Complete user-facing features, can be part of an epic"
tp labels update "Task" -c "#10B981" -d "Individual implementation work, usually a commit"
tp labels update "Subtask" -c "#6B7280" -d "A part of an implementation step"

# Update Stack group
tp labels update "Backend" -c "#EF4444" -d "Python backend work (FastAPI, SQLAlchemy, services)"
tp labels update "Frontend" -c "#F59E0B" -d "React frontend work (TypeScript, components, UI)"
tp labels update "Full Stack" -c "#EC4899" -d "Work spanning both backend and frontend"

# Verify
tp labels list --hierarchy
```

## Best Practices

1. **Keep groups mutually exclusive** except for Domain labels
2. **Use consistent colors** within groups for visual scanning
3. **Write clear descriptions** that explain when to use each label
4. **Document label conventions** in team wiki or README
5. **Review periodically** and archive unused labels
6. **Use hierarchical labels** for scalable organization
7. **Apply templates** for consistency across teams

## Color Palette Reference

**Primary Colors:**
- Red: `#EF4444` or `#DC2626` - Urgent, Backend, Bugs
- Orange: `#F59E0B` - Frontend, Medium priority
- Green: `#10B981` - Tasks, Features, Success
- Blue: `#3B82F6` - Stories, Information
- Purple: `#8B5CF6` or `#A78BFA` - Epics, Infrastructure
- Pink: `#EC4899` - Full Stack, Special
- Teal: `#14B8A6` - Architecture, Planning
- Gray: `#6B7280` - Subtasks, Low priority
- Indigo: `#6366F1` - Infrastructure

**Usage Tips:**
- Lighter shades for less critical items
- Darker shades for higher priority/importance
- Consistent color families for related concepts

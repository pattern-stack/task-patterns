/**
 * Molecules Layer - Domain Logic and API Facades
 * 
 * This layer contains:
 * - API Facades: High-level interfaces combining entities and workflows
 * - Entities: Domain aggregates with business logic
 * - Workflows: Complex multi-step business operations
 */

// API Facades - The primary interface for external consumers (CLI, MCP, etc.)
export { IssueAPI } from './issue.api';
export { LabelAPI, LABEL_TEMPLATES } from './apis/label.api';
// Future: export { TeamAPI } from './team.api';
// Future: export { ProjectAPI } from './project.api';
// Future: export { UserAPI } from './user.api';
// Future: export { CycleAPI } from './cycle.api';

// Entities - Domain aggregates (used internally by APIs)
export { IssueEntity } from './entities/issue.entity';

// Workflows - Complex operations (used internally by APIs)
export { BulkOperationsWorkflow } from './workflows/bulk-operations.workflow';
export { SmartSearchWorkflow } from './workflows/smart-search.workflow';
export { SprintPlanningWorkflow } from './workflows/sprint-planning.workflow';
export { IssueRelationsWorkflow } from './workflows/issue-relations.workflow';
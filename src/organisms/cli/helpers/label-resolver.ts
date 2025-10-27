import type { LinearClient, IssueLabel } from '@linear/sdk';
import chalk from 'chalk';
import { logger } from '@atoms/shared/logger';

/**
 * Result of label resolution operation
 */
export interface LabelResolutionResult {
  resolved: IssueLabel[];
  notFound: string[];
}

/**
 * Resolve label names or IDs to label objects
 *
 * @param labelInput - Comma-separated label names or IDs
 * @param teamId - Optional team ID for scoped resolution
 * @param client - Linear client instance
 * @returns Resolution result with resolved labels and not found labels
 */
export async function resolveLabelIds(
  labelInput: string,
  teamId: string | undefined,
  client: LinearClient
): Promise<LabelResolutionResult> {
  const result: LabelResolutionResult = {
    resolved: [],
    notFound: [],
  };

  // Handle empty input
  if (!labelInput || labelInput.trim() === '') {
    return result;
  }

  // Parse input - split by comma and trim whitespace
  const labelInputs = labelInput
    .split(',')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Remove duplicates
  const uniqueInputs = [...new Set(labelInputs)];

  // Fetch all labels based on team context
  const filter: any = {};
  if (teamId !== undefined) {
    filter.team = { id: { eq: teamId } };
  }

  try {
    const labelsResponse = await client.issueLabels({ filter });
    const allLabels = labelsResponse.nodes;

    // Build lookup maps
    const labelsByName = new Map<string, IssueLabel>();
    const labelsById = new Map<string, IssueLabel>();

    for (const label of allLabels) {
      labelsByName.set(label.name.toLowerCase(), label);
      labelsById.set(label.id, label);
    }

    // Resolve each input
    const resolvedIds = new Set<string>();

    for (const input of uniqueInputs) {
      let resolved: IssueLabel | undefined;

      // Check if input is a UUID (ID)
      if (isUUID(input)) {
        resolved = labelsById.get(input);
      }

      // If not found or not a UUID, try resolving by name
      if (!resolved) {
        resolved = labelsByName.get(input.toLowerCase());
      }

      if (resolved && !resolvedIds.has(resolved.id)) {
        result.resolved.push(resolved);
        resolvedIds.add(resolved.id);
      } else if (!resolved) {
        result.notFound.push(input);
      }
    }

    logger.debug(
      `Resolved ${result.resolved.length}/${uniqueInputs.length} labels`,
      { notFound: result.notFound }
    );

    return result;
  } catch (error) {
    logger.error('Failed to resolve label IDs', error);
    throw error;
  }
}

/**
 * Check if string is a UUID
 */
function isUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Find similar labels using fuzzy matching
 *
 * @param query - Search query
 * @param allLabels - All available labels
 * @param maxResults - Maximum number of results to return
 * @returns Array of similar labels
 */
export function findSimilarLabels(
  query: string,
  allLabels: IssueLabel[],
  maxResults: number = 5
): IssueLabel[] {
  const lowerQuery = query.toLowerCase();
  const similarities: Array<{ label: IssueLabel; score: number }> = [];

  for (const label of allLabels) {
    const lowerName = label.name.toLowerCase();
    let score = 0;

    // Exact match (should not happen in this context, but handle anyway)
    if (lowerName === lowerQuery) {
      score = 100;
    }
    // Starts with query
    else if (lowerName.startsWith(lowerQuery)) {
      score = 80;
    }
    // Contains query
    else if (lowerName.includes(lowerQuery)) {
      score = 60;
    }
    // Same category (for hierarchical labels)
    else if (lowerQuery.includes(':') && lowerName.includes(':')) {
      const queryCategory = lowerQuery.split(':')[0];
      const labelCategory = lowerName.split(':')[0];
      if (queryCategory === labelCategory) {
        score = 40;
      }
    }
    // Levenshtein distance-based similarity
    else {
      const distance = levenshteinDistance(lowerQuery, lowerName);
      const maxLength = Math.max(lowerQuery.length, lowerName.length);
      const similarity = 1 - distance / maxLength;
      if (similarity > 0.5) {
        score = similarity * 30;
      }
    }

    if (score > 0) {
      similarities.push({ label, score });
    }
  }

  // Sort by score descending and take top N
  similarities.sort((a, b) => b.score - a.score);
  return similarities.slice(0, maxResults).map((s) => s.label);
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Format label list for display
 * Groups hierarchical labels by category
 *
 * @param labels - Labels to format
 * @returns Formatted string
 */
export function formatLabelList(labels: IssueLabel[]): string {
  if (labels.length === 0) {
    return chalk.gray('No labels available');
  }

  // Group labels by category
  const hierarchical = new Map<string, IssueLabel[]>();
  const nonHierarchical: IssueLabel[] = [];

  for (const label of labels) {
    if (label.name.includes(':')) {
      const [category] = label.name.split(':', 2);
      if (!hierarchical.has(category)) {
        hierarchical.set(category, []);
      }
      hierarchical.get(category)!.push(label);
    } else {
      nonHierarchical.push(label);
    }
  }

  const output: string[] = [];

  // Display hierarchical labels grouped by category
  if (hierarchical.size > 0) {
    output.push(chalk.cyan('\n==> Labels by Category\n'));

    for (const [category, categoryLabels] of hierarchical.entries()) {
      output.push(chalk.yellow(`  ${category}:`));
      for (const label of categoryLabels) {
        const [, value] = label.name.split(':', 2);
        const colorDot = label.color
          ? chalk.hex(label.color)('●')
          : chalk.gray('○');
        output.push(`    ${colorDot} ${chalk.white(value)} ${chalk.dim(`(${label.name})`)}`);
      }
      output.push('');
    }
  }

  // Display non-hierarchical labels
  if (nonHierarchical.length > 0) {
    output.push(chalk.cyan('  Other Labels:'));
    for (const label of nonHierarchical) {
      const colorDot = label.color
        ? chalk.hex(label.color)('●')
        : chalk.gray('○');
      output.push(`    ${colorDot} ${chalk.white(label.name)}`);
    }
    output.push('');
  }

  return output.join('\n');
}

/**
 * Format label resolution errors with suggestions
 *
 * @param notFound - Labels that were not found
 * @param allLabels - All available labels for suggestions
 * @returns Formatted error message
 */
export function formatLabelErrors(
  notFound: string[],
  allLabels: IssueLabel[]
): string {
  const output: string[] = [];

  output.push(chalk.red('\n✗ Some labels could not be found:\n'));

  for (const labelName of notFound) {
    output.push(chalk.red(`  • ${labelName}`));

    // Find similar labels
    const similar = findSimilarLabels(labelName, allLabels, 3);
    if (similar.length > 0) {
      output.push(
        chalk.yellow('    Did you mean: ') +
          similar.map((l) => chalk.white(l.name)).join(', ')
      );
    }
  }

  output.push('');
  output.push(chalk.dim('  Tip: Use --list-labels to see all available labels'));
  output.push('');

  return output.join('\n');
}

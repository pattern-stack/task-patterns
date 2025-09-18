#!/usr/bin/env node
/**
 * CLI Entry Point for npm distribution
 * This file replaces bin/tp.js when published to npm
 */

// Preserve the original working directory before any imports
process.env.TP_ORIGINAL_CWD = process.cwd();

// Import the CLI with proper working directory handling
import './organisms/cli/index';

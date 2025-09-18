#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Get the directory where this script is located (bin/)
const binDir = __dirname;
// Get the project root (parent of bin/)
const projectRoot = path.dirname(binDir);

// Preserve the original working directory
const originalCwd = process.cwd();

// Run the CLI from the project root but preserve the original CWD in an env var
const child = spawn('npx', ['tsx', 'src/organisms/cli/index.ts', ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: projectRoot,
  env: {
    ...process.env,
    TP_ORIGINAL_CWD: originalCwd
  }
});

child.on('exit', (code) => {
  process.exit(code);
});
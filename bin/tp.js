#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Get the directory where this script is located (bin/)
const binDir = __dirname;
// Get the project root (parent of bin/)
const projectRoot = path.dirname(binDir);

// Change to project directory and run the CLI
process.chdir(projectRoot);

const child = spawn('npx', ['tsx', 'src/organisms/cli/index.ts', ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: projectRoot
});

child.on('exit', (code) => {
  process.exit(code);
});
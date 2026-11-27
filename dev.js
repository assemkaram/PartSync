// TEAM P02 | STEP P02-014 | Review this file, then remove this marker only.
import { spawn } from 'node:child_process';
import process from 'node:process';

const packageManager = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const children = [];
let stopping = false;

function start(label, args) {
  const child = spawn(packageManager, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  child.on('error', (error) => {
    console.error(`[${label}] failed to start: ${error.message}`);
    stop(1);
  });
  child.on('exit', (code, signal) => {
    if (!stopping) {
      console.error(`[${label}] exited (${signal || code}); stopping the other service.`);
      stop(code ?? 1);
    }
  });
  children.push(child);
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 400).unref();
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
console.log('[RIGPILOT] Starting client (5173) and API server (3001)...');
start('server', ['--dir', 'server', 'dev']);
start('client', ['--dir', 'client', 'dev']);

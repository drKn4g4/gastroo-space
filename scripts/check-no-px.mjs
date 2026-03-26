#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createNodeLogger } from './helpers/node-logger.mjs';

const log = createNodeLogger('check-no-px');
log.banner('Check disallowed px units');
log.stage('Scanning src/**');

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, 'src');
const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.scss']);
const PX_REGEX = /\b\d+(?:\.\d+)?px\b/g;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, out);
      continue;
    }

    if (!ALLOWED_EXTENSIONS.has(extname(fullPath))) continue;
    out.push(fullPath);
  }
  return out;
}

function toRelative(path) {
  return path.replace(ROOT + '/', '');
}

if (!statSync(SRC_DIR, { throwIfNoEntry: false })) {
  log.error('src directory does not exist');
  process.exit(1);
}

const files = walk(SRC_DIR);
const violations = [];

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    const matches = [...line.matchAll(PX_REGEX)];
    if (matches.length === 0) return;

    for (const match of matches) {
      violations.push({
        file: toRelative(file),
        line: index + 1,
        value: match[0],
      });
    }
  });
}

if (violations.length > 0) {
  log.error('Found disallowed px units in src/:');
  for (const v of violations) {
    console.error(`- ${v.file}:${v.line} -> ${v.value}`);
  }
  process.exit(1);
}

log.ok('No px units found in src/');

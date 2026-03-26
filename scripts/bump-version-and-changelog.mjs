#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function stderrLog(message) {
  process.stderr.write(`${message}\n`);
}

function logStage(name) {
  stderrLog('------------------------------------------------');
  stderrLog(`[ETAP] ${name}`);
  stderrLog('------------------------------------------------');
}

function parseArgs(argv) {
  const out = {
    env: 'staging',
    target: 'gcp',
    sha: process.env.GITHUB_SHA || 'local',
    runNumber: process.env.GITHUB_RUN_NUMBER || 'local',
  };

  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const val = argv[i + 1];
    if (key === '--env' && val) {
      out.env = val;
      i += 1;
    } else if (key === '--target' && val) {
      out.target = val;
      i += 1;
    } else if (key === '--sha' && val) {
      out.sha = val;
      i += 1;
    } else if (key === '--run-number' && val) {
      out.runNumber = val;
      i += 1;
    }
  }

  return out;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, json) {
  fs.writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
}

function bumpPatch(version) {
  const m = String(version).trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return '0.1.0';
  const major = Number(m[1]);
  const minor = Number(m[2]);
  const patch = Number(m[3]) + 1;
  return `${major}.${minor}.${patch}`;
}

function parseSemver(version) {
  const m = String(version).trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

function compareSemver(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function maxSemverString(a, b) {
  const av = parseSemver(a);
  const bv = parseSemver(b);
  if (!av && !bv) return '0.1.0';
  if (!av) return b;
  if (!bv) return a;
  return compareSemver(av, bv) >= 0 ? a : b;
}

function highestVersionInChangelog(changelogPath) {
  if (!fs.existsSync(changelogPath)) return '0.1.0';
  const text = fs.readFileSync(changelogPath, 'utf8');
  const matches = [...text.matchAll(/^## \[(\d+\.\d+\.\d+)\] - /gm)].map((m) => m[1]);
  if (matches.length === 0) return '0.1.0';
  return matches.reduce((acc, cur) => maxSemverString(acc, cur), '0.1.0');
}

function todayIso() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function updateChangelog(changelogPath, params) {
  const current = fs.existsSync(changelogPath)
    ? fs.readFileSync(changelogPath, 'utf8')
    : '# Changelog\n\n';

  const header = `## [${params.version}] - ${params.date}`;
  if (current.includes(header)) {
    return;
  }

  const shortSha = params.sha.slice(0, 7);
  const section = [
    `${header}`,
    '',
    '### Changed',
    `- Automated deploy release for ${params.env} (${params.target})`,
    `- CI run: ${params.runNumber}, commit: ${shortSha}`,
    '',
  ].join('\n');

  const marker = '# Changelog\n\n';
  let updated;
  if (current.startsWith(marker)) {
    updated = `${marker}${section}${current.slice(marker.length)}`;
  } else {
    updated = `# Changelog\n\n${section}${current}`;
  }

  fs.writeFileSync(changelogPath, updated, 'utf8');
}

function ensureVersionField(pkg) {
  if (!pkg.version || typeof pkg.version !== 'string') {
    pkg.version = '0.1.0';
  }
}

function main() {
  const args = parseArgs(process.argv);

  stderrLog('================================================');
  stderrLog('GASTROO RELEASE METADATA');
  stderrLog('================================================');

  const root = process.cwd();
  const rootPkgPath = path.join(root, 'package.json');
  const fnPkgPath = path.join(root, 'functions', 'package.json');
  const changelogPath = path.join(root, 'CHANGELOG.md');

  const rootPkg = readJson(rootPkgPath);
  ensureVersionField(rootPkg);

  logStage('Wyznaczanie wersji docelowej');

  const highestFromChangelog = highestVersionInChangelog(changelogPath);
  const baseVersion = maxSemverString(rootPkg.version, highestFromChangelog);
  const nextVersion = bumpPatch(baseVersion);
  stderrLog(`baseVersion=${baseVersion}`);
  stderrLog(`nextVersion=${nextVersion}`);

  logStage('Aktualizacja package.json');
  rootPkg.version = nextVersion;
  writeJson(rootPkgPath, rootPkg);

  if (fs.existsSync(fnPkgPath)) {
    logStage('Aktualizacja functions/package.json');
    const fnPkg = readJson(fnPkgPath);
    ensureVersionField(fnPkg);
    fnPkg.version = nextVersion;
    writeJson(fnPkgPath, fnPkg);
  }

  logStage('Aktualizacja CHANGELOG.md');
  updateChangelog(changelogPath, {
    version: nextVersion,
    date: todayIso(),
    env: args.env,
    target: args.target,
    sha: args.sha,
    runNumber: args.runNumber,
  });

  stderrLog('OK  Release metadata updated.');

  process.stdout.write(`NEXT_VERSION=${nextVersion}\n`);
}

main();

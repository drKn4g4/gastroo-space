const COLORS = {
  reset: '\u001b[0m',
  bold: '\u001b[1m',
  cyan: '\u001b[36m',
  blue: '\u001b[34m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  red: '\u001b[31m',
};

function useColor() {
  return !process.env.NO_COLOR && process.stdout.isTTY;
}

function paint(text, color) {
  if (!useColor()) return text;
  return `${color}${text}${COLORS.reset}`;
}

function print(level, scope, message, stream = process.stdout) {
  const levelColor =
    level === 'ERR' ? COLORS.red :
    level === 'WARN' ? COLORS.yellow :
    level === 'OK' ? COLORS.green :
    COLORS.cyan;
  const tag = paint(`[${level}]`, levelColor);
  const name = scope ? `${paint(scope, COLORS.blue)} ` : '';
  stream.write(`${tag} ${name}${String(message)}\n`);
}

export function createNodeLogger(scope = '') {
  return {
    banner(title) {
      const line = '='.repeat(64);
      process.stdout.write(`${line}\n`);
      process.stdout.write(`${paint('GASTROO SCRIPT', COLORS.bold)} ${paint(scope, COLORS.blue)}\n`);
      process.stdout.write(`${paint(title, COLORS.cyan)}\n`);
      process.stdout.write(`${line}\n`);
    },
    stage(title) {
      const line = '-'.repeat(64);
      process.stdout.write(`\n${line}\n`);
      process.stdout.write(`${paint('[ETAP]', COLORS.bold)} ${title}\n`);
      process.stdout.write(`${line}\n`);
    },
    info(msg) {
      print('INFO', scope, msg);
    },
    ok(msg) {
      print('OK', scope, msg);
    },
    warn(msg) {
      print('WARN', scope, msg);
    },
    error(msg) {
      print('ERR', scope, msg, process.stderr);
    },
  };
}

export function installConsoleDecorators(scope = '') {
  if (globalThis.__GASTROO_CONSOLE_DECORATED__) return;
  globalThis.__GASTROO_CONSOLE_DECORATED__ = true;

  const log = console.log.bind(console);
  const warn = console.warn.bind(console);
  const error = console.error.bind(console);

  console.log = (...args) => log(`${paint('[INFO]', COLORS.cyan)} ${scope}`, ...args);
  console.warn = (...args) => warn(`${paint('[WARN]', COLORS.yellow)} ${scope}`, ...args);
  console.error = (...args) => error(`${paint('[ERR]', COLORS.red)} ${scope}`, ...args);
}

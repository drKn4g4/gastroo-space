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

function createNodeLogger(scope = '') {
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
      process.stdout.write(`${paint('[INFO]', COLORS.cyan)} ${scope} ${String(msg)}\n`);
    },
    ok(msg) {
      process.stdout.write(`${paint('[OK]', COLORS.green)} ${scope} ${String(msg)}\n`);
    },
    warn(msg) {
      process.stdout.write(`${paint('[WARN]', COLORS.yellow)} ${scope} ${String(msg)}\n`);
    },
    error(msg) {
      process.stderr.write(`${paint('[ERR]', COLORS.red)} ${scope} ${String(msg)}\n`);
    },
  };
}

function installConsoleDecorators(scope = '') {
  if (global.__GASTROO_CONSOLE_DECORATED__) return;
  global.__GASTROO_CONSOLE_DECORATED__ = true;

  const log = console.log.bind(console);
  const warn = console.warn.bind(console);
  const error = console.error.bind(console);

  console.log = (...args) => log(`${paint('[INFO]', COLORS.cyan)} ${scope}`, ...args);
  console.warn = (...args) => warn(`${paint('[WARN]', COLORS.yellow)} ${scope}`, ...args);
  console.error = (...args) => error(`${paint('[ERR]', COLORS.red)} ${scope}`, ...args);
}

module.exports = {
  createNodeLogger,
  installConsoleDecorators,
};

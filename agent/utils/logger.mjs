const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  magenta: '\x1b[35m',
};

export const log = {
  info: (msg) =>
    console.log(`${c.cyan}ℹ${c.reset}  ${msg}`),

  success: (msg) =>
    console.log(`${c.green}✓${c.reset}  ${msg}`),

  warn: (msg) =>
    console.log(`${c.yellow}⚠${c.reset}  ${msg}`),

  error: (msg) =>
    console.error(`${c.red}✗${c.reset}  ${msg}`),

  step: (label, msg) =>
    console.log(`\n${c.magenta}${c.bold}[${label}]${c.reset} ${c.bold}${msg}${c.reset}`),

  debug: (msg) => {
    if (process.env.DEBUG === 'true' || process.env.DEBUG === '1') {
      console.log(`${c.gray}⟫ ${msg}${c.reset}`);
    }
  },
};

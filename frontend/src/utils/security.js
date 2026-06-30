/**
 * Debounce function calls (search, filters).
 */
export function debounce(fn, delay = 400) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Prevent duplicate form submissions.
 */
export function createSubmitLock() {
  let locked = false;
  return {
    isLocked: () => locked,
    lock: () => {
      locked = true;
    },
    unlock: () => {
      locked = false;
    },
    async run(fn) {
      if (locked) return null;
      locked = true;
      try {
        return await fn();
      } finally {
        locked = false;
      }
    },
  };
}

/**
 * Generate idempotency key for critical API calls.
 */
export function idempotencyKey(prefix = 'req') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Allowed frontend origins for anti-phishing checks.
 */
const ALLOWED_HOSTS = [
  'localhost',
  '127.0.0.1',
  'tailieu-ptit.vercel.app',
  'tailieuptit.lcdkhoacntt1.com',
  'tailieu-ptit.vercel.app',
];

export function validateCurrentDomain() {
  const host = window.location.hostname;
  if (ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
    return true;
  }
  console.warn('[Security] Unrecognized host:', host);
  return false;
}

import { CredentialsSignin } from "@auth/core/errors";

const RATE_LIMIT_POLICIES = {
  apiAuth: {
    windowMs: 5 * 60 * 1000,
    blockMs: 5 * 60 * 1000,
    maxAttempts: 30,
  },
  mfaChallenge: {
    windowMs: 10 * 60 * 1000,
    blockMs: 15 * 60 * 1000,
    maxAttempts: 6,
  },
  passwordResetConsume: {
    windowMs: 15 * 60 * 1000,
    blockMs: 30 * 60 * 1000,
    maxAttempts: 6,
  },
  passwordResetRequest: {
    windowMs: 15 * 60 * 1000,
    blockMs: 30 * 60 * 1000,
    maxAttempts: 4,
  },
  registration: {
    windowMs: 30 * 60 * 1000,
    blockMs: 30 * 60 * 1000,
    maxAttempts: 3,
  },
  signIn: {
    windowMs: 10 * 60 * 1000,
    blockMs: 10 * 60 * 1000,
    maxAttempts: 5,
  },
} as const;

type RateLimitScope = keyof typeof RATE_LIMIT_POLICIES;

type AttemptBucket = {
  blockedUntil: number | null;
  count: number;
  windowStart: number;
};

type AttemptStore = {
  [Key in RateLimitScope]: Map<string, AttemptBucket>;
};

const globalAttemptStore = globalThis as typeof globalThis & {
  __authAttemptStore?: AttemptStore;
};

function buildAttemptStore(): AttemptStore {
  return {
    apiAuth: new Map(),
    mfaChallenge: new Map(),
    passwordResetConsume: new Map(),
    passwordResetRequest: new Map(),
    registration: new Map(),
    signIn: new Map(),
  };
}

function getAttemptStore() {
  if (!globalAttemptStore.__authAttemptStore) {
    globalAttemptStore.__authAttemptStore = buildAttemptStore();
  }

  return globalAttemptStore.__authAttemptStore;
}

function normalizeToken(value: string | null | undefined) {
  const normalizedValue = value?.trim().toLowerCase();
  return normalizedValue || "unknown";
}

function getClientIpFromHeaders(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for");

  if (forwardedFor) {
    return normalizeToken(forwardedFor.split(",")[0]);
  }

  return normalizeToken(
    headers.get("x-real-ip") ??
      headers.get("cf-connecting-ip") ??
      headers.get("x-vercel-forwarded-for"),
  );
}

function getBucketState(
  bucketMap: Map<string, AttemptBucket>,
  key: string,
  windowMs: number,
  now: number,
) {
  const currentBucket = bucketMap.get(key);

  if (!currentBucket) {
    return null;
  }

  if (currentBucket.blockedUntil && currentBucket.blockedUntil <= now) {
    bucketMap.delete(key);
    return null;
  }

  if (now - currentBucket.windowStart > windowMs) {
    bucketMap.delete(key);
    return null;
  }

  return currentBucket;
}

function recordFailure(scope: RateLimitScope, key: string) {
  const policy = RATE_LIMIT_POLICIES[scope];
  const bucketMap = getAttemptStore()[scope];
  const now = Date.now();
  const existingBucket = getBucketState(bucketMap, key, policy.windowMs, now);

  if (!existingBucket) {
    bucketMap.set(key, {
      blockedUntil: null,
      count: 1,
      windowStart: now,
    });
    return;
  }

  existingBucket.count += 1;

  if (existingBucket.count >= policy.maxAttempts) {
    existingBucket.blockedUntil = now + policy.blockMs;
  }
}

function clearFailures(scope: RateLimitScope, key: string) {
  getAttemptStore()[scope].delete(key);
}

function isBlocked(scope: RateLimitScope, key: string) {
  const policy = RATE_LIMIT_POLICIES[scope];
  const bucket = getBucketState(getAttemptStore()[scope], key, policy.windowMs, Date.now());
  return Boolean(bucket?.blockedUntil);
}

function buildScopedKey(identifier: string, source: Headers | Request) {
  return `${normalizeToken(identifier)}|${getClientIp(source)}`;
}

function buildIpScopedKey(source: Headers | Request) {
  return getClientIp(source);
}

export class RateLimitedCredentialsError extends CredentialsSignin {
  code = "temporarily_blocked";
}

export class RateLimitedActionError extends Error {
  code = "temporarily_blocked";
}

export function getClientIp(source: Headers | Request) {
  return getClientIpFromHeaders(source instanceof Request ? source.headers : source);
}

export function assertSignInAllowed(email: string, request: Request) {
  if (isBlocked("signIn", buildScopedKey(email, request))) {
    throw new RateLimitedCredentialsError();
  }
}

export function recordSignInFailure(email: string, request: Request) {
  recordFailure("signIn", buildScopedKey(email, request));
}

export function clearSignInFailures(email: string, request: Request) {
  clearFailures("signIn", buildScopedKey(email, request));
}

export function isRegistrationBlocked(ipAddress: string) {
  return isBlocked("registration", normalizeToken(ipAddress));
}

export function recordRegistrationFailure(ipAddress: string) {
  recordFailure("registration", normalizeToken(ipAddress));
}

export function clearRegistrationFailures(ipAddress: string) {
  clearFailures("registration", normalizeToken(ipAddress));
}

export function assertApiAuthAllowed(source: Headers | Request) {
  if (isBlocked("apiAuth", buildIpScopedKey(source))) {
    throw new RateLimitedActionError();
  }
}

export function recordApiAuthFailure(source: Headers | Request) {
  recordFailure("apiAuth", buildIpScopedKey(source));
}

export function clearApiAuthFailures(source: Headers | Request) {
  clearFailures("apiAuth", buildIpScopedKey(source));
}

export function assertMfaChallengeAllowed(subject: string, source: Headers | Request) {
  if (isBlocked("mfaChallenge", buildScopedKey(subject, source))) {
    throw new RateLimitedActionError();
  }
}

export function recordMfaChallengeFailure(subject: string, source: Headers | Request) {
  recordFailure("mfaChallenge", buildScopedKey(subject, source));
}

export function clearMfaChallengeFailures(subject: string, source: Headers | Request) {
  clearFailures("mfaChallenge", buildScopedKey(subject, source));
}

export function assertPasswordResetRequestAllowed(
  email: string,
  source: Headers | Request,
) {
  if (isBlocked("passwordResetRequest", buildScopedKey(email, source))) {
    throw new RateLimitedActionError();
  }
}

export function recordPasswordResetRequestFailure(
  email: string,
  source: Headers | Request,
) {
  recordFailure("passwordResetRequest", buildScopedKey(email, source));
}

export function clearPasswordResetRequestFailures(
  email: string,
  source: Headers | Request,
) {
  clearFailures("passwordResetRequest", buildScopedKey(email, source));
}

export function assertPasswordResetConsumeAllowed(
  tokenKey: string,
  source: Headers | Request,
) {
  if (isBlocked("passwordResetConsume", buildScopedKey(tokenKey, source))) {
    throw new RateLimitedActionError();
  }
}

export function recordPasswordResetConsumeFailure(
  tokenKey: string,
  source: Headers | Request,
) {
  recordFailure("passwordResetConsume", buildScopedKey(tokenKey, source));
}

export function clearPasswordResetConsumeFailures(
  tokenKey: string,
  source: Headers | Request,
) {
  clearFailures("passwordResetConsume", buildScopedKey(tokenKey, source));
}

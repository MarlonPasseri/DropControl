import { CredentialsSignin } from "@auth/core/errors";

const SIGN_IN_WINDOW_MS = 10 * 60 * 1000;
const SIGN_IN_BLOCK_MS = 10 * 60 * 1000;
const SIGN_IN_MAX_ATTEMPTS = 5;
const REGISTRATION_WINDOW_MS = 30 * 60 * 1000;
const REGISTRATION_BLOCK_MS = 30 * 60 * 1000;
const REGISTRATION_MAX_ATTEMPTS = 3;

type AttemptBucket = {
  blockedUntil: number | null;
  count: number;
  windowStart: number;
};

type AttemptStore = {
  registration: Map<string, AttemptBucket>;
  signIn: Map<string, AttemptBucket>;
};

const globalAttemptStore = globalThis as typeof globalThis & {
  __authAttemptStore?: AttemptStore;
};

function getAttemptStore() {
  if (!globalAttemptStore.__authAttemptStore) {
    globalAttemptStore.__authAttemptStore = {
      registration: new Map(),
      signIn: new Map(),
    };
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

function recordFailure(
  bucketMap: Map<string, AttemptBucket>,
  key: string,
  windowMs: number,
  blockMs: number,
  maxAttempts: number,
) {
  const now = Date.now();
  const existingBucket = getBucketState(bucketMap, key, windowMs, now);

  if (!existingBucket) {
    bucketMap.set(key, {
      blockedUntil: null,
      count: 1,
      windowStart: now,
    });
    return;
  }

  existingBucket.count += 1;

  if (existingBucket.count >= maxAttempts) {
    existingBucket.blockedUntil = now + blockMs;
  }
}

function clearFailures(bucketMap: Map<string, AttemptBucket>, key: string) {
  bucketMap.delete(key);
}

function isBlocked(
  bucketMap: Map<string, AttemptBucket>,
  key: string,
  windowMs: number,
) {
  const bucket = getBucketState(bucketMap, key, windowMs, Date.now());
  return Boolean(bucket?.blockedUntil);
}

function buildSignInKey(email: string, ipAddress: string) {
  return `${normalizeToken(email)}|${normalizeToken(ipAddress)}`;
}

export class RateLimitedCredentialsError extends CredentialsSignin {
  code = "temporarily_blocked";
}

export function getClientIp(source: Headers | Request) {
  return getClientIpFromHeaders(source instanceof Request ? source.headers : source);
}

export function assertSignInAllowed(email: string, request: Request) {
  const key = buildSignInKey(email, getClientIp(request));
  const { signIn } = getAttemptStore();

  if (isBlocked(signIn, key, SIGN_IN_WINDOW_MS)) {
    throw new RateLimitedCredentialsError();
  }
}

export function recordSignInFailure(email: string, request: Request) {
  const key = buildSignInKey(email, getClientIp(request));
  recordFailure(
    getAttemptStore().signIn,
    key,
    SIGN_IN_WINDOW_MS,
    SIGN_IN_BLOCK_MS,
    SIGN_IN_MAX_ATTEMPTS,
  );
}

export function clearSignInFailures(email: string, request: Request) {
  clearFailures(getAttemptStore().signIn, buildSignInKey(email, getClientIp(request)));
}

export function isRegistrationBlocked(ipAddress: string) {
  return isBlocked(getAttemptStore().registration, normalizeToken(ipAddress), REGISTRATION_WINDOW_MS);
}

export function recordRegistrationFailure(ipAddress: string) {
  recordFailure(
    getAttemptStore().registration,
    normalizeToken(ipAddress),
    REGISTRATION_WINDOW_MS,
    REGISTRATION_BLOCK_MS,
    REGISTRATION_MAX_ATTEMPTS,
  );
}

export function clearRegistrationFailures(ipAddress: string) {
  clearFailures(getAttemptStore().registration, normalizeToken(ipAddress));
}

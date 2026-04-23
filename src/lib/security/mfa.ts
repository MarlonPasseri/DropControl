import crypto from "node:crypto";

const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const TOTP_WINDOW_STEPS = 1;
const MFA_ISSUER = "DropControl";
const MFA_SECRET_BYTES = 20;
const MFA_PENDING_COOKIE = "dropcontrol_mfa_setup";
const MFA_RECOVERY_CODES_COOKIE = "dropcontrol_mfa_recovery_codes";
const MFA_VERIFICATION_COOKIE = "dropcontrol_mfa_verified";
const MFA_RECOVERY_CODE_COUNT = 8;
const MFA_RECOVERY_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type PendingMfaSetup = {
  createdAt: number;
  secret: string;
  userId: string;
};

type VerifiedMfaSession = {
  userId: string;
  verifiedAt: number;
};

type RecoveryCodesPayload = {
  codes: string[];
  createdAt: number;
  userId: string;
};

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function getAuthSecret() {
  const value = process.env.AUTH_SECRET?.trim();

  if (!value) {
    throw new Error("AUTH_SECRET precisa estar configurado para MFA.");
  }

  return value;
}

function getEncryptionKey() {
  return crypto.createHash("sha256").update(getAuthSecret()).digest();
}

function encryptText(plainText: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, ciphertext].map((part) => part.toString("base64url")).join(".");
}

function decryptText(payload: string) {
  const [ivText, authTagText, ciphertextText] = payload.split(".");

  if (!ivText || !authTagText || !ciphertextText) {
    throw new Error("Payload criptografado invalido.");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivText, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTagText, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function encodeBase32(buffer: Buffer) {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function decodeBase32(value: string) {
  const normalized = value.replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
  let bits = 0;
  let current = 0;
  const output: number[] = [];

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);

    if (index === -1) {
      throw new Error("Segredo MFA invalido.");
    }

    current = (current << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((current >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

function createTotpToken(secret: string, timestampMs: number) {
  const counter = Math.floor(timestampMs / 1000 / TOTP_STEP_SECONDS);
  const counterBytes = Buffer.alloc(8);
  counterBytes.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac("sha1", decodeBase32(secret)).update(counterBytes).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (binary % 10 ** TOTP_DIGITS).toString().padStart(TOTP_DIGITS, "0");
}

function cookieBaseOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

function serializePayload(value: Record<string, unknown>) {
  return encryptText(JSON.stringify(value));
}

function deserializePayload<T>(value: string | undefined | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(decryptText(value)) as T;
  } catch {
    return null;
  }
}

export function generateTotpSecret() {
  return encodeBase32(crypto.randomBytes(MFA_SECRET_BYTES));
}

export function getOtpAuthUri(input: { email: string; secret: string }) {
  const label = `${MFA_ISSUER}:${input.email}`;
  const params = new URLSearchParams({
    secret: input.secret,
    issuer: MFA_ISSUER,
    algorithm: "SHA1",
    digits: `${TOTP_DIGITS}`,
    period: `${TOTP_STEP_SECONDS}`,
  });

  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}

export function normalizeMfaCode(value: string | null | undefined) {
  return value?.replace(/\s+/g, "").replace(/-/g, "").trim() ?? "";
}

export function verifyTotpCode(input: { secret: string; code: string }) {
  const normalizedCode = normalizeMfaCode(input.code);

  if (!/^\d{6}$/.test(normalizedCode)) {
    return false;
  }

  const now = Date.now();

  for (let step = -TOTP_WINDOW_STEPS; step <= TOTP_WINDOW_STEPS; step += 1) {
    if (
      createTotpToken(
        input.secret,
        now + step * TOTP_STEP_SECONDS * 1000,
      ) === normalizedCode
    ) {
      return true;
    }
  }

  return false;
}

export function normalizeRecoveryCode(value: string | null | undefined) {
  return value?.replace(/\s+/g, "").replace(/-/g, "").trim().toUpperCase() ?? "";
}

function formatRecoveryCode(value: string) {
  return `${value.slice(0, 5)}-${value.slice(5)}`;
}

export function generateRecoveryCodes(count = MFA_RECOVERY_CODE_COUNT) {
  return Array.from({ length: count }, () => {
    const rawCode = Array.from({ length: 10 }, () => {
      const index = crypto.randomInt(0, MFA_RECOVERY_CODE_ALPHABET.length);
      return MFA_RECOVERY_CODE_ALPHABET[index];
    }).join("");

    return formatRecoveryCode(rawCode);
  });
}

export function hashRecoveryCode(value: string) {
  return crypto
    .createHash("sha256")
    .update(`${getAuthSecret()}:mfa-recovery:${normalizeRecoveryCode(value)}`)
    .digest("base64url");
}

export function hashRecoveryCodes(codes: string[]) {
  return codes.map((code) => hashRecoveryCode(code));
}

export function getRecoveryCodeCount(value: unknown) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string").length : 0;
}

export function consumeRecoveryCode(
  storedCodes: unknown,
  submittedCode: string,
) {
  if (!Array.isArray(storedCodes)) {
    return {
      matched: false,
      nextCodes: null,
    };
  }

  const normalizedHashes = storedCodes.filter(
    (item): item is string => typeof item === "string" && item.length > 0,
  );
  const submittedHash = hashRecoveryCode(submittedCode);
  const nextCodes = normalizedHashes.filter((hash) => hash !== submittedHash);

  return {
    matched: nextCodes.length !== normalizedHashes.length,
    nextCodes,
  };
}

export function encryptMfaSecret(secret: string) {
  return encryptText(secret);
}

export function decryptMfaSecret(ciphertext: string | null | undefined) {
  if (!ciphertext) {
    return null;
  }

  try {
    return decryptText(ciphertext);
  } catch {
    return null;
  }
}

export function isMfaRequired(input: {
  mfaEnabled?: boolean | null;
  role?: string | null;
}) {
  return Boolean(input.mfaEnabled) && input.role === "ADMIN";
}

export function getMfaSetupCookieName() {
  return MFA_PENDING_COOKIE;
}

export function getMfaRecoveryCodesCookieName() {
  return MFA_RECOVERY_CODES_COOKIE;
}

export function getMfaVerificationCookieName() {
  return MFA_VERIFICATION_COOKIE;
}

export function buildPendingMfaSetupValue(payload: PendingMfaSetup) {
  return serializePayload(payload);
}

export function readPendingMfaSetupValue(
  rawValue: string | undefined,
  userId: string,
): PendingMfaSetup | null {
  const payload = deserializePayload<PendingMfaSetup>(rawValue);

  if (!payload || payload.userId !== userId) {
    return null;
  }

  return payload;
}

export function buildVerifiedMfaSessionValue(payload: VerifiedMfaSession) {
  return serializePayload(payload);
}

export function buildRecoveryCodesDisplayValue(payload: RecoveryCodesPayload) {
  return serializePayload(payload);
}

export function readVerifiedMfaSessionValue(
  rawValue: string | undefined,
  userId: string,
): VerifiedMfaSession | null {
  const payload = deserializePayload<VerifiedMfaSession>(rawValue);

  if (!payload || payload.userId !== userId) {
    return null;
  }

  return payload;
}

export function readRecoveryCodesDisplayValue(
  rawValue: string | undefined,
  userId: string,
) {
  const payload = deserializePayload<RecoveryCodesPayload>(rawValue);

  if (!payload || payload.userId !== userId || !Array.isArray(payload.codes)) {
    return null;
  }

  return payload;
}

export function hasVerifiedMfaCookie(
  cookiesStore:
    | { get(name: string): { value: string } | undefined }
    | { get(name: string): { value?: string } | undefined | null },
  userId: string,
) {
  return Boolean(readVerifiedMfaSessionValue(cookiesStore.get(MFA_VERIFICATION_COOKIE)?.value, userId));
}

export function getMfaVerificationCookieOptions() {
  return {
    ...cookieBaseOptions(),
    maxAge: 60 * 60 * 8,
  };
}

export function getPendingMfaSetupCookieOptions() {
  return {
    ...cookieBaseOptions(),
    maxAge: 60 * 15,
  };
}

export function getRecoveryCodesCookieOptions() {
  return {
    ...cookieBaseOptions(),
    maxAge: 60 * 20,
  };
}

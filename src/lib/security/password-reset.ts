import crypto from "node:crypto";

const PASSWORD_RESET_TOKEN_BYTES = 32;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

function getPasswordResetSecret() {
  const value = process.env.AUTH_SECRET?.trim();

  if (!value) {
    throw new Error("AUTH_SECRET precisa estar configurado para reset de senha.");
  }

  return value;
}

export function hashPasswordResetToken(token: string) {
  return crypto
    .createHash("sha256")
    .update(`${getPasswordResetSecret()}:password-reset:${token.trim()}`)
    .digest("base64url");
}

export function generatePasswordResetToken() {
  const token = crypto.randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("base64url");

  return {
    token,
    tokenHash: hashPasswordResetToken(token),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
  };
}

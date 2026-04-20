import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_SIZE = 12;

function getEncryptionSecret() {
  const secret = process.env.TIKTOK_SHOP_TOKEN_SECRET ?? process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error(
      "Defina TIKTOK_SHOP_TOKEN_SECRET ou AUTH_SECRET para proteger os tokens do TikTok Shop.",
    );
  }

  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(IV_SIZE);
  const cipher = createCipheriv(ALGORITHM, getEncryptionSecret(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(
    ".",
  );
}

export function decryptSecret(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  const [ivPart, authTagPart, encryptedPart] = value.split(".");

  if (!ivPart || !authTagPart || !encryptedPart) {
    return undefined;
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getEncryptionSecret(),
    Buffer.from(ivPart, "base64"),
  );
  decipher.setAuthTag(Buffer.from(authTagPart, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

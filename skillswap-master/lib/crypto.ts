import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Hash a password with a per-user random salt using scrypt.
 * Returns hex-encoded salt + hash. Local hackathon auth — not production grade.
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyPassword(
  password: string,
  hash: string,
  salt: string,
): boolean {
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export function newToken(): string {
  return randomBytes(24).toString("hex");
}

import { randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

const SESSION_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const SECRET_HEADER = "x-session-secret";

export function isSessionId(value: unknown): value is string {
  return typeof value === "string" && SESSION_ID.test(value);
}

export function newSecret(): string {
  return randomBytes(32).toString("hex");
}

export function readSecret(request: NextRequest): string | null {
  return parseSecret(request.headers.get(SECRET_HEADER));
}

export function parseSecret(value: unknown): string | null {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/i.test(value)) return null;
  return value;
}

export function secretMatches(stored: string, given: string): boolean {
  if (!stored || stored.length !== given.length) return false;
  return timingSafeEqual(Buffer.from(stored), Buffer.from(given));
}

export function sanitizeName(name: string): string | null {
  const cleaned = name.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (cleaned.length < 1 || cleaned.length > 20) return null;
  return cleaned;
}

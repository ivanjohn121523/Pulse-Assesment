import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

// Prefer the platform header a client cannot overwrite. Fall back to the
// proxy headers used in local and self-hosted deploys.
export function clientIp(request: NextRequest): string | null {
  const vercel = request.headers.get("x-vercel-forwarded-for");
  const real = request.headers.get("x-real-ip");
  const forwarded = request.headers.get("x-forwarded-for");
  const raw = (vercel || real || forwarded || "").split(",")[0]?.trim() ?? "";
  if (raw && raw.length <= 64) return raw;
  // Local dev has no proxy header. Treat this machine as one network so a
  // block can still be shown. In production a missing IP is not guessed.
  if (process.env.NODE_ENV !== "production") return "127.0.0.1";
  return null;
}

export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export function ipHashFrom(request: NextRequest): string {
  const ip = clientIp(request);
  return ip ? hashIp(ip) : "";
}

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyPrivacyOffset, isValidLatLng } from "@/lib/geo";
import { isGender } from "@/lib/types";
import { isSessionId, newSecret, sanitizeName } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/join — body { id, name, gender, lat, lng } (raw coords).
// Applies a 1–3 km privacy offset and creates the presence row. Raw
// coordinates are never stored. The public id is visible to other dots;
// the returned secret is not, and later calls must present it.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const { id, name, gender, lat, lng } = (body ?? {}) as Record<string, unknown>;

  if (!isSessionId(id)) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }
  if (typeof name !== "string") {
    return Response.json({ error: "invalid name" }, { status: 400 });
  }
  const displayName = sanitizeName(name);
  if (!displayName) {
    return Response.json({ error: "invalid name" }, { status: 400 });
  }
  if (!isGender(gender)) {
    return Response.json({ error: "invalid gender" }, { status: 400 });
  }
  if (!isValidLatLng(lat, lng)) {
    return Response.json({ error: "invalid coordinates" }, { status: 400 });
  }

  const existing = await prisma.presence.findUnique({
    where: { id },
    select: { id: true },
  });
  if (existing) {
    return Response.json({ error: "session already exists" }, { status: 409 });
  }

  const offset = applyPrivacyOffset(lat as number, lng as number);
  const secret = newSecret();

  await prisma.presence.create({
    data: {
      id,
      secret,
      name: displayName,
      gender,
      lat: offset.lat,
      lng: offset.lng,
      busy: false,
      lastSeen: new Date(),
    },
  });

  return Response.json({ ok: true, secret });
}

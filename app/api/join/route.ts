import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyPrivacyOffset, isValidLatLng } from "@/lib/geo";
import { isGender } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NAME_MAX = 20;

// POST /api/join — body { id, name, gender, lat, lng } (raw coords).
// Applies a 1–3 km privacy offset and upserts the presence row. Raw
// coordinates are never stored. The name and gender live on that row and
// are removed with it when the session ends.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const { id, name, gender, lat, lng } = (body ?? {}) as Record<string, unknown>;

  if (typeof id !== "string" || id.length < 8 || id.length > 64) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }
  if (typeof name !== "string") {
    return Response.json({ error: "invalid name" }, { status: 400 });
  }
  const displayName = name.trim();
  if (displayName.length < 1 || displayName.length > NAME_MAX) {
    return Response.json({ error: "invalid name" }, { status: 400 });
  }
  if (!isGender(gender)) {
    return Response.json({ error: "invalid gender" }, { status: 400 });
  }
  if (!isValidLatLng(lat, lng)) {
    return Response.json({ error: "invalid coordinates" }, { status: 400 });
  }

  const offset = applyPrivacyOffset(lat as number, lng as number);

  await prisma.presence.upsert({
    where: { id },
    create: {
      id,
      name: displayName,
      gender,
      lat: offset.lat,
      lng: offset.lng,
      busy: false,
      lastSeen: new Date(),
    },
    update: {
      name: displayName,
      gender,
      lat: offset.lat,
      lng: offset.lng,
      lastSeen: new Date(),
    },
  });

  return Response.json({ ok: true });
}

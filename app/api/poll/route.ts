import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { STALE_MS, SIGNAL_TTL_MS } from "@/lib/presence";
import { isGender, type PollResponse } from "@/lib/types";
import { isSessionId, readSecret, secretMatches } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/poll?id= — header x-session-secret.
// Heartbeats the caller, reaps stale rows, returns other dots, and drains
// this session's mailbox. The secret is required so a public dot id cannot
// be used to steal signaling or keep someone else online.
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const secret = readSecret(request);

  if (!isSessionId(id)) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }
  if (!secret) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const me = await prisma.presence.findUnique({
    where: { id },
    select: { secret: true },
  });
  if (!me || !secretMatches(me.secret, secret)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const staleCutoff = new Date(now - STALE_MS);
  const signalCutoff = new Date(now - SIGNAL_TTL_MS);

  await prisma.presence.updateMany({
    where: { id },
    data: { lastSeen: new Date(now) },
  });

  const stale = await prisma.presence.findMany({
    where: { lastSeen: { lt: staleCutoff } },
    select: { id: true },
  });
  if (stale.length > 0) {
    const staleIds = stale.map((row) => row.id);
    await prisma.knock.deleteMany({
      where: { OR: [{ toId: { in: staleIds } }, { fromId: { in: staleIds } }] },
    });
    await prisma.presence.deleteMany({ where: { id: { in: staleIds } } });
  }
  await prisma.signal.deleteMany({ where: { createdAt: { lt: signalCutoff } } });
  await prisma.knock.deleteMany({ where: { createdAt: { lt: signalCutoff } } });

  const peers = await prisma.presence.findMany({
    where: {
      id: { not: id },
      lastSeen: { gte: staleCutoff },
    },
    select: { id: true, name: true, gender: true, lat: true, lng: true, busy: true },
  });

  const inbox = await prisma.signal.findMany({
    where: { toId: id },
    orderBy: { createdAt: "asc" },
  });
  if (inbox.length > 0) {
    await prisma.signal.deleteMany({
      where: { id: { in: inbox.map((s) => s.id) } },
    });
  }

  const response: PollResponse = {
    peers: peers.map((p) => ({
      id: p.id,
      name: p.name,
      gender: isGender(p.gender) ? p.gender : null,
      lat: p.lat,
      lng: p.lng,
      busy: p.busy,
    })),
    signals: inbox.map((s) => ({
      id: s.id,
      fromId: s.fromId,
      toId: s.toId,
      type: s.type as PollResponse["signals"][number]["type"],
      payload: s.payload,
      createdAt: s.createdAt.toISOString(),
    })),
  };

  return Response.json(response);
}

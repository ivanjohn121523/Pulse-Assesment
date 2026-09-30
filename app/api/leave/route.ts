import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSessionId, parseSecret, secretMatches } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/leave — body { id, secret }. Removes this session. Called via
// navigator.sendBeacon on tab close, so the body may arrive as text.
export async function POST(request: NextRequest) {
  let id: unknown;
  let secret: unknown;
  try {
    const text = await request.text();
    const body = text ? (JSON.parse(text) as { id?: unknown; secret?: unknown }) : {};
    id = body.id;
    secret = body.secret;
  } catch {
    id = undefined;
    secret = undefined;
  }

  if (!isSessionId(id)) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }
  const sessionSecret = parseSecret(secret);
  if (!sessionSecret) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const row = await prisma.presence.findUnique({
    where: { id },
    select: { secret: true, partnerId: true },
  });
  if (!row || !secretMatches(row.secret, sessionSecret)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const partnerId = row.partnerId;

  await prisma.knock.deleteMany({
    where: { OR: [{ toId: id }, { fromId: id }] },
  });
  await prisma.signal.deleteMany({
    where: { OR: [{ toId: id }, { fromId: id }] },
  });
  if (partnerId) {
    await prisma.presence.updateMany({
      where: { id: partnerId, partnerId: id },
      data: { busy: false, partnerId: null },
    });
    await prisma.signal.create({
      data: { fromId: id, toId: partnerId, type: "end", payload: null },
    });
  }
  await prisma.presence.deleteMany({ where: { id } });

  return Response.json({ ok: true });
}

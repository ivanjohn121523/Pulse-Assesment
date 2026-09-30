import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SignalType } from "@/lib/types";
import { isSessionId, readSecret, secretMatches } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES: SignalType[] = [
  "request",
  "accept",
  "decline",
  "offer",
  "answer",
  "ice",
  "end",
];

const MAX_PAYLOAD = 64 * 1024;
const SIGNAL_BURST = 80;

// POST /api/signal — header x-session-secret, body { fromId, toId, type, payload? }
// The secret must belong to fromId. Busy only changes for a real request
// that was accepted, or for ending that pair — a decline of someone else
// cannot clear an active call.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const secret = readSecret(request);
  const { fromId, toId, type, payload } = (body ?? {}) as Record<string, unknown>;

  if (!isSessionId(fromId) || !isSessionId(toId) || fromId === toId) {
    return Response.json({ error: "invalid ids" }, { status: 400 });
  }
  if (!secret) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (typeof type !== "string" || !VALID_TYPES.includes(type as SignalType)) {
    return Response.json({ error: "invalid type" }, { status: 400 });
  }
  if (
    payload !== undefined &&
    payload !== null &&
    (typeof payload !== "string" || payload.length > MAX_PAYLOAD)
  ) {
    return Response.json({ error: "invalid payload" }, { status: 400 });
  }

  const from = await prisma.presence.findUnique({
    where: { id: fromId },
    select: { secret: true, busy: true, partnerId: true },
  });
  if (!from || !secretMatches(from.secret, secret)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const recent = await prisma.signal.count({
    where: { fromId, createdAt: { gt: new Date(Date.now() - 60_000) } },
  });
  if (recent >= SIGNAL_BURST) {
    return Response.json({ error: "too many signals" }, { status: 429 });
  }

  const signalType = type as SignalType;
  const payloadStr = typeof payload === "string" ? payload : null;

  if (signalType === "request") {
    const target = await prisma.presence.findUnique({
      where: { id: toId },
      select: { busy: true },
    });
    if (!target || target.busy) {
      await sendDecline(toId, fromId);
      return Response.json({ ok: true, autoDeclined: true });
    }
    const knock = await prisma.knock.findUnique({
      where: { toId_fromId: { toId, fromId } },
      select: { id: true },
    });
    if (!knock) {
      await prisma.knock.create({ data: { toId, fromId } });
      await prisma.signal.create({
        data: { fromId, toId, type: "request", payload: null },
      });
    }
    return Response.json({ ok: true });
  }

  if (signalType === "accept") {
    const knock = await prisma.knock.findUnique({
      where: { toId_fromId: { toId: fromId, fromId: toId } },
      select: { id: true },
    });
    const target = await prisma.presence.findUnique({
      where: { id: toId },
      select: { busy: true },
    });
    if (!knock || !target || from.busy || target.busy) {
      return Response.json({ error: "no request to accept" }, { status: 409 });
    }

    const others = await prisma.knock.findMany({
      where: { toId: fromId, NOT: { fromId: toId } },
      select: { fromId: true },
    });
    await prisma.knock.deleteMany({ where: { toId: fromId } });
    await prisma.presence.update({
      where: { id: fromId },
      data: { busy: true, partnerId: toId },
    });
    await prisma.presence.update({
      where: { id: toId },
      data: { busy: true, partnerId: fromId },
    });
    await prisma.signal.create({
      data: { fromId, toId, type: "accept", payload: null },
    });
    if (others.length > 0) {
      await prisma.signal.createMany({
        data: others.map((other) => ({
          fromId,
          toId: other.fromId,
          type: "decline",
          payload: null,
        })),
      });
    }
    return Response.json({ ok: true });
  }

  if (signalType === "decline") {
    const removed = await prisma.knock.deleteMany({
      where: {
        OR: [
          { toId: fromId, fromId: toId },
          { toId, fromId },
        ],
      },
    });
    const wasPartner = from.partnerId === toId;
    if (wasPartner) await clearPair(fromId, toId);
    if (removed.count > 0 || wasPartner) {
      await prisma.signal.create({
        data: { fromId, toId, type: "decline", payload: null },
      });
    }
    return Response.json({ ok: true });
  }

  if (signalType === "end") {
    if (from.partnerId !== toId) {
      return Response.json({ error: "not connected" }, { status: 409 });
    }
    await clearPair(fromId, toId);
    await prisma.signal.create({
      data: { fromId, toId, type: "end", payload: null },
    });
    return Response.json({ ok: true });
  }

  if (from.partnerId !== toId) {
    return Response.json({ error: "not connected" }, { status: 409 });
  }
  await prisma.signal.create({
    data: { fromId, toId, type: signalType, payload: payloadStr },
  });
  return Response.json({ ok: true });
}

async function sendDecline(targetId: string, initiatorId: string) {
  await prisma.signal.create({
    data: { fromId: targetId, toId: initiatorId, type: "decline", payload: null },
  });
}

async function clearPair(a: string, b: string) {
  await prisma.presence.updateMany({
    where: { id: { in: [a, b] } },
    data: { busy: false, partnerId: null },
  });
}

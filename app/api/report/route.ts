import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ipHashFrom } from "@/lib/ip";
import { dropSession, isIpBlocked, REPORTS_TO_BLOCK } from "@/lib/moderation";
import { isSessionId, readSecret, secretMatches } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/report — header x-session-secret, body { fromId, targetId }.
// Only the person you are in a call with can be reported.
// Two reports against that IP block it.
export async function POST(request: NextRequest) {
  if (await isIpBlocked(ipHashFrom(request))) {
    return Response.json({ error: "blocked" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const secret = readSecret(request);
  const { fromId, targetId } = (body ?? {}) as Record<string, unknown>;
  if (!isSessionId(fromId) || !isSessionId(targetId) || fromId === targetId) {
    return Response.json({ error: "invalid ids" }, { status: 400 });
  }
  if (!secret) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const reporter = await prisma.presence.findUnique({
    where: { id: fromId },
    select: { secret: true, partnerId: true },
  });
  if (!reporter || !secretMatches(reporter.secret, secret)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (reporter.partnerId !== targetId) {
    return Response.json({ error: "not connected" }, { status: 409 });
  }

  const target = await prisma.presence.findUnique({
    where: { id: targetId },
    select: { ipHash: true },
  });
  if (!target) {
    return Response.json({ error: "not connected" }, { status: 409 });
  }

  const targetKey = target.ipHash || ipHashFrom(request) || `session:${targetId}`;
  await prisma.report.create({ data: { reporterId: fromId, targetKey } });

  const reports = await prisma.report.count({ where: { targetKey } });
  if (reports >= REPORTS_TO_BLOCK) {
    if (targetKey && !targetKey.startsWith("session:")) {
      await prisma.blockedIp.upsert({
        where: { ipHash: targetKey },
        create: { ipHash: targetKey },
        update: {},
      });
    }
    await dropSession(targetId);
  }

  return Response.json({ ok: true, reports });
}

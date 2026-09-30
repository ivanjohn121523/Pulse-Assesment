import { prisma } from "@/lib/prisma";

export const REPORTS_TO_BLOCK = 2;

export async function isIpBlocked(ipHash: string): Promise<boolean> {
  if (!ipHash) return false;
  const row = await prisma.blockedIp.findUnique({
    where: { ipHash },
    select: { ipHash: true },
  });
  return row !== null;
}

// Remove a live session and tell their partner the call is over.
export async function dropSession(id: string): Promise<void> {
  const row = await prisma.presence.findUnique({
    where: { id },
    select: { partnerId: true },
  });
  if (!row) return;

  await prisma.knock.deleteMany({
    where: { OR: [{ toId: id }, { fromId: id }] },
  });
  await prisma.signal.deleteMany({
    where: { OR: [{ toId: id }, { fromId: id }] },
  });
  if (row.partnerId) {
    await prisma.presence.updateMany({
      where: { id: row.partnerId, partnerId: id },
      data: { busy: false, partnerId: null },
    });
    await prisma.signal.create({
      data: { fromId: id, toId: row.partnerId, type: "end", payload: null },
    });
  }
  await prisma.presence.deleteMany({ where: { id } });
}

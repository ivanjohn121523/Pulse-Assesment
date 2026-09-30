// Client-side helpers for talking to the coordination API.
import type { Gender, PollResponse, SignalType } from "@/lib/types";

const SECRET_HEADER = "x-session-secret";

export async function join(
  id: string,
  name: string,
  gender: Gender,
  lat: number,
  lng: number,
): Promise<string> {
  const res = await fetch("/api/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, name, gender, lat, lng }),
  });
  if (res.status === 403) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (data?.error === "blocked") throw new Error("blocked");
  }
  if (!res.ok) throw new Error(`join failed: ${res.status}`);
  const data = (await res.json()) as { secret?: string };
  if (!data.secret) throw new Error("join failed: missing secret");
  return data.secret;
}

export async function poll(id: string, secret: string): Promise<PollResponse> {
  const res = await fetch(`/api/poll?id=${encodeURIComponent(id)}`, {
    cache: "no-store",
    headers: { [SECRET_HEADER]: secret },
  });
  if (res.status === 403) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (data?.error === "blocked") throw new Error("blocked");
  }
  if (!res.ok) throw new Error(`poll failed: ${res.status}`);
  return res.json();
}

export async function sendSignal(
  fromId: string,
  toId: string,
  type: SignalType,
  payload: string | undefined,
  secret: string,
): Promise<void> {
  await fetch("/api/signal", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [SECRET_HEADER]: secret,
    },
    body: JSON.stringify({ fromId, toId, type, payload }),
  });
}

export async function report(
  fromId: string,
  targetId: string,
  secret: string,
): Promise<void> {
  const res = await fetch("/api/report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [SECRET_HEADER]: secret,
    },
    body: JSON.stringify({ fromId, targetId }),
  });
  if (!res.ok) throw new Error(`report failed: ${res.status}`);
}

// Fire-and-forget leave that survives the tab closing.
export function leave(id: string, secret: string): void {
  const body = JSON.stringify({ id, secret });
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon("/api/leave", body);
  } else {
    void fetch("/api/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  }
}

"use client";

export default function RequestList({
  requests,
  onAccept,
  onDecline,
}: {
  requests: { peerId: string; name: string }[];
  onAccept: (peerId: string) => void;
  onDecline: (peerId: string) => void;
}) {
  if (requests.length === 0) return null;

  return (
    <aside className="absolute left-4 top-4 z-30 w-64 rounded-2xl border border-zinc-800 bg-zinc-950/95 p-3 text-zinc-100 shadow-xl backdrop-blur">
      <p className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Requests
      </p>
      <ul className="mt-2 flex max-h-80 flex-col gap-2 overflow-y-auto">
        {requests.map((request) => (
          <li key={request.peerId} className="rounded-xl bg-zinc-900 px-3 py-2">
            <p className="truncate text-sm font-medium">{request.name}</p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => onDecline(request.peerId)}
                className="flex-1 rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-500"
              >
                Decline
              </button>
              <button
                onClick={() => onAccept(request.peerId)}
                className="flex-1 rounded-full bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-300"
              >
                Accept
              </button>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}

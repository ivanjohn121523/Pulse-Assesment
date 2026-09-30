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
    <aside className="ui-card absolute left-4 top-4 z-30 w-64 rounded-3xl p-3">
      <p className="ui-kicker px-1">Requests</p>
      <ul className="mt-3 flex max-h-80 flex-col gap-2 overflow-y-auto">
        {requests.map((request) => (
          <li
            key={request.peerId}
            className="rounded-2xl border border-white/8 bg-white/4 px-3 py-2.5"
          >
            <p className="truncate text-sm font-medium tracking-tight">{request.name}</p>
            <div className="mt-2.5 flex gap-2">
              <button
                onClick={() => onDecline(request.peerId)}
                className="ui-btn ui-btn-ghost flex-1 py-1.5 text-xs"
              >
                Decline
              </button>
              <button
                onClick={() => onAccept(request.peerId)}
                className="ui-btn ui-btn-primary flex-1 py-1.5 text-xs"
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

"use client";

// Reusable centered prompt for "someone wants to connect" and
// "someone wants to start video".
export default function ConnectionPrompt({
  title,
  subtitle,
  acceptLabel,
  declineLabel,
  onAccept,
  onDecline,
}: {
  title: string;
  subtitle?: string;
  acceptLabel: string;
  declineLabel: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 p-6">
      <div className="ui-card w-full max-w-xs rounded-3xl p-6 text-center">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-1.5 text-sm leading-relaxed text-white/50">{subtitle}</p>}
        <div className="mt-5 flex gap-3">
          <button
            onClick={onDecline}
            className="ui-btn ui-btn-ghost flex-1 py-2.5 text-sm"
          >
            {declineLabel}
          </button>
          <button
            onClick={onAccept}
            className="ui-btn ui-btn-primary flex-1 py-2.5 text-sm"
          >
            {acceptLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

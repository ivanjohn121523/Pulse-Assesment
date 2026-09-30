"use client";

import { useEffect, useRef, useState } from "react";

export default function VideoPanel({
  localStream,
  remoteStream,
  onEnd,
}: {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onEnd: () => void;
}) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    const el = localRef.current;
    if (!el || el.srcObject === localStream) return;
    el.srcObject = localStream;
    if (localStream) void el.play().catch(() => {});
  }, [localStream]);

  useEffect(() => {
    const el = remoteRef.current;
    if (!el) return;
    if (el.srcObject !== remoteStream) el.srcObject = remoteStream;
    if (!remoteStream) {
      setNeedsTap(false);
      return;
    }
    el.play()
      .then(() => setNeedsTap(false))
      .catch(() => setNeedsTap(true));
  }, [remoteStream]);

  function playRemote() {
    const el = remoteRef.current;
    if (!el) return;
    void el.play().then(() => setNeedsTap(false)).catch(() => {});
  }

  return (
    <div className="absolute inset-y-0 left-0 right-0 z-30 flex min-h-0 flex-col overflow-hidden bg-black md:right-[28rem]">
      <div className="relative min-h-0 flex-1">
        <video
          ref={remoteRef}
          autoPlay
          playsInline
          onClick={playRemote}
          className="absolute inset-0 h-full w-full bg-zinc-950 object-cover"
        />
        {!remoteStream && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white/50">
            Waiting for their video…
          </div>
        )}
        {needsTap && (
          <button
            type="button"
            onClick={playRemote}
            className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-medium text-white"
          >
            Tap to play video
          </button>
        )}
        <div className="absolute right-4 top-4 w-36 overflow-hidden rounded-2xl border border-white/15 shadow-lg sm:w-48">
          <video
            ref={localRef}
            autoPlay
            playsInline
            muted
            className="aspect-video w-full bg-[#0c0e14] object-cover [transform:scaleX(-1)]"
          />
          <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
            You
          </span>
        </div>
      </div>
      <div className="flex shrink-0 justify-center border-t border-white/10 bg-[#0c0e14] p-4">
        <button onClick={onEnd} className="ui-btn ui-btn-danger px-8 py-3 text-sm">
          End video
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

export interface ChatMessage {
  id: number;
  mine: boolean;
  text: string;
}

export default function ChatPanel({
  peerName,
  messages,
  connected,
  videoBusy,
  onSend,
  onStartVideo,
  onEnd,
}: {
  peerName: string;
  messages: ChatMessage[];
  connected: boolean;
  videoBusy: boolean;
  onSend: (text: string) => void;
  onStartVideo: () => void;
  onEnd: () => void;
}) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !connected) return;
    onSend(text);
    setDraft("");
  }

  return (
    <div className="absolute inset-y-0 right-0 z-20 flex w-full max-w-md flex-col overflow-hidden border-l border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl">
      <div className="chat-live-bg" aria-hidden="true" />
      <div className="chat-live-scrim" aria-hidden="true" />
      <header className="relative z-10 flex items-center justify-between border-b border-white/10 bg-zinc-950/35 px-4 py-3 backdrop-blur-sm">
        <div>
          <p className="font-semibold">{peerName}</p>
          <p className="text-xs text-zinc-300">
            {connected ? "Connected" : "Connecting…"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onStartVideo}
            disabled={!connected || videoBusy}
            className="rounded-full border border-zinc-700 px-3 py-1.5 text-sm hover:border-zinc-500 disabled:opacity-40"
          >
            Video
          </button>
          <button
            onClick={onEnd}
            className="rounded-full bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-400"
          >
            End
          </button>
        </div>
      </header>

      <div className="relative z-10 flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-zinc-300">
            Say hello. Messages are peer-to-peer and never stored.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.mine ? "justify-end" : "justify-start"}`}
          >
            <span
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                m.mine
                  ? "bg-emerald-400 text-zinc-950"
                  : "bg-zinc-950/70 text-zinc-100 backdrop-blur-sm"
              }`}
            >
              {m.text}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={submit}
        className="relative z-10 flex gap-2 border-t border-white/10 bg-zinc-950/35 p-3 backdrop-blur-sm"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={connected ? "Type a message…" : "Connecting…"}
          disabled={!connected}
          className="flex-1 rounded-full bg-zinc-950/70 px-4 py-2 text-sm outline-none placeholder:text-zinc-400 focus:ring-1 focus:ring-emerald-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!connected || !draft.trim()}
          className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}

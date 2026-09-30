"use client";

import { useEffect, useRef, useState } from "react";
import type { Gender } from "@/lib/types";
import GenderBadge from "./GenderBadge";

export interface ChatMessage {
  id: number;
  mine: boolean;
  text: string;
}

export default function ChatPanel({
  peerName,
  peerGender,
  messages,
  connected,
  videoBusy,
  onSend,
  onStartVideo,
  onEnd,
}: {
  peerName: string;
  peerGender: Gender | null;
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
    <div className="absolute inset-y-0 right-0 z-20 flex w-full max-w-md flex-col border-l border-white/10 bg-[#0c0e14] text-[var(--foreground)] shadow-[0_0_80px_rgba(0,0,0,0.45)]">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3.5">
        <div>
          <p className="flex items-center gap-2 font-semibold tracking-tight">
            {peerGender && <GenderBadge gender={peerGender} />}
            {peerName}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/45">
            <span
              className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-[var(--accent)]" : "bg-white/30"}`}
            />
            {connected ? "Connected" : "Connecting…"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onStartVideo}
            disabled={!connected || videoBusy}
            className="ui-btn ui-btn-ghost px-3 py-1.5 text-sm"
          >
            Video
          </button>
          <button
            onClick={onEnd}
            className="ui-btn ui-btn-danger px-3 py-1.5 text-sm"
          >
            End
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="mt-10 text-center text-sm leading-relaxed text-white/40">
            Say hello. Messages are peer-to-peer and never stored.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.mine ? "justify-end" : "justify-start"}`}
          >
            <span
              className={`max-w-[80%] px-3.5 py-2 text-sm leading-relaxed ${
                m.mine
                  ? "rounded-2xl rounded-br-md bg-[var(--accent)] text-[var(--accent-ink)]"
                  : "rounded-2xl rounded-bl-md bg-white/8 text-[var(--foreground)]"
              }`}
            >
              {m.text}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-white/10 p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={connected ? "Type a message…" : "Connecting…"}
          disabled={!connected}
          className="ui-field flex-1 px-4 py-2.5 text-sm"
        />
        <button
          type="submit"
          disabled={!connected || !draft.trim()}
          className="ui-btn ui-btn-primary px-4 py-2 text-sm"
        >
          Send
        </button>
      </form>
    </div>
  );
}

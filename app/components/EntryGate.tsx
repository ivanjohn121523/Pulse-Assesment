"use client";

import { useState } from "react";

const NAME_MAX = 20;

export default function EntryGate({
  onReady,
}: {
  onReady: (name: string, lat: number, lng: number) => void;
}) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "locating" | "error">("idle");
  const [error, setError] = useState<string>("");
  const displayName = name.trim();

  function enter(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName) {
      setStatus("error");
      setError("Enter a username to continue.");
      return;
    }
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setError("Your browser doesn't support location access.");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => onReady(displayName, pos.coords.latitude, pos.coords.longitude),
      (err) => {
        setStatus("error");
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission is required to place you on the map."
            : "Couldn't get your location. Please try again.",
        );
      },
      // High accuracy + maximumAge:0 forces a fresh fix (Wi-Fi/GPS scan)
      // instead of reusing the browser's cached IP-based location.
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  return (
    <div className="relative flex min-h-full flex-1 flex-col items-center justify-center gap-8 overflow-hidden p-6 text-zinc-100">
      <div className="chat-live-bg" aria-hidden="true" />
      <div className="landing-scrim" aria-hidden="true" />
      <div className="relative z-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Pulse</h1>
        <p className="mt-2 max-w-sm text-zinc-200">
          A living globe of anonymous strangers. Drop onto the map and connect.
        </p>
      </div>

      <form
        onSubmit={enter}
        className="relative z-10 flex w-full max-w-xs flex-col items-center gap-4"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX}
          placeholder="Username"
          autoComplete="nickname"
          disabled={status === "locating"}
          className="w-full rounded-full border border-white/20 bg-zinc-950/60 px-5 py-3 text-center text-zinc-100 outline-none backdrop-blur-sm placeholder:text-zinc-400 focus:border-emerald-400 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status === "locating" || !displayName}
          className="rounded-full bg-emerald-400 px-8 py-3 font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:opacity-60"
        >
          {status === "locating" ? "Locating…" : "Enter Pulse"}
        </button>
      </form>

      {status === "error" && (
        <p className="relative z-10 max-w-sm text-center text-sm text-red-300">{error}</p>
      )}

      <p className="relative z-10 max-w-sm text-center text-xs text-zinc-300">
        No sign-up. Your dot is placed 1–3&nbsp;km from your real location.
        Your name is removed when you close the tab.
      </p>
    </div>
  );
}

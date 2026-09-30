"use client";

import { useState } from "react";

const NAME_MAX = 20;

export default function EntryGate({
  onReady,
}: {
  onReady: (name: string, lat: number, lng: number) => void;
}) {
  const [name, setName] = useState("");
  const [ageGate, setAgeGate] = useState<"idle" | "ask" | "no">("idle");
  const [status, setStatus] = useState<"idle" | "locating" | "error">("idle");
  const [error, setError] = useState<string>("");
  const displayName = name.trim();

  function enter(e: React.FormEvent) {
    e.preventDefault();
    if (ageGate === "no" || status === "locating") return;
    if (!displayName) {
      setStatus("error");
      setError("Enter a username to continue.");
      return;
    }
    setStatus("idle");
    setError("");
    setAgeGate("ask");
  }

  function confirmAge() {
    if (!("geolocation" in navigator)) {
      setAgeGate("idle");
      setStatus("error");
      setError("Your browser doesn't support location access.");
      return;
    }
    setAgeGate("idle");
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
    <div className="relative flex min-h-full flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16 text-[var(--foreground)]">
      <div className="chat-live-bg" aria-hidden="true" />
      <div className="landing-scrim" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-sm text-center">
        <p className="ui-kicker">Anonymous · Live</p>
        <h1 className="mt-4 text-6xl font-semibold tracking-[-0.05em]">Pulse</h1>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-white/70">
          A living globe of anonymous strangers. Drop onto the map and connect.
        </p>

        <form
          onSubmit={enter}
          className="ui-card mt-8 flex flex-col gap-3 rounded-3xl p-4 text-left"
        >
          <label className="px-1 text-xs font-medium text-white/55" htmlFor="username">
            What should people call you?
          </label>
          <input
            id="username"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_MAX}
            placeholder="Username"
            autoComplete="nickname"
            disabled={status === "locating"}
            className="ui-field px-4 py-3 text-center text-base"
          />
          <button
            type="submit"
            disabled={status === "locating" || !displayName}
            className="ui-btn ui-btn-primary w-full py-3 text-sm"
          >
            {status === "locating" ? "Locating…" : "Enter Pulse"}
          </button>
        </form>

        {status === "error" && (
          <p className="mt-4 text-sm text-[#ffb4ab]">{error}</p>
        )}

        <p className="mt-5 text-xs leading-relaxed text-white/45">
          No sign-up. Your dot is placed 1–3&nbsp;km from your real location.
          Your name is removed when you close the tab.
        </p>
      </div>

      {ageGate !== "idle" && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 p-6">
          <div className="ui-card w-full max-w-xs rounded-3xl p-6 text-center">
            {ageGate === "ask" ? (
              <>
                <h2 className="text-lg font-semibold tracking-tight">Are you 18 or older?</h2>
                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setAgeGate("no")}
                    className="ui-btn ui-btn-ghost flex-1 py-2.5 text-sm"
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={confirmAge}
                    className="ui-btn ui-btn-primary flex-1 py-2.5 text-sm"
                  >
                    Yes
                  </button>
                </div>
              </>
            ) : (
              <h2 className="text-lg font-semibold tracking-tight">Not allowed</h2>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

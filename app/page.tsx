"use client";

import { useEffect, useRef, useState } from "react";
import EntryGate from "./components/EntryGate";
import WorldMap from "./components/WorldMap";
import ConnectionPrompt from "./components/ConnectionPrompt";
import RequestList from "./components/RequestList";
import ChatPanel, { type ChatMessage } from "./components/ChatPanel";
import VideoPanel from "./components/VideoPanel";
import { join, leave, poll, sendSignal } from "@/lib/api";
import { PeerSession, type DescType, type PeerControl } from "@/lib/webrtc";
import { POLL_INTERVAL_MS } from "@/lib/presence";
import { type Gender, type PeerDot, type SignalMsg } from "@/lib/types";

type Conn =
  | { kind: "idle" }
  | { kind: "requesting"; peerId: string }
  | { kind: "connecting"; peerId: string }
  | { kind: "connected"; peerId: string };

type IncomingRequest = { peerId: string };

type VideoState = "none" | "requesting" | "incoming" | "active";

const REQUEST_TIMEOUT_MS = 30_000;

export default function Home() {
  const [phase, setPhase] = useState<"gate" | "live">("gate");
  const [sessionId] = useState(() => crypto.randomUUID());
  const [peers, setPeers] = useState<PeerDot[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [myGender, setMyGender] = useState<Gender | null>(null);

  const [dotPromptId, setDotPromptId] = useState<string | null>(null);
  const [incoming, _setIncoming] = useState<IncomingRequest[]>([]);
  const incomingRef = useRef<IncomingRequest[]>([]);
  const setIncoming = (next: IncomingRequest[]) => {
    incomingRef.current = next;
    _setIncoming(next);
  };

  const [conn, _setConn] = useState<Conn>({ kind: "idle" });
  const connRef = useRef<Conn>(conn);
  const setConn = (c: Conn) => {
    connRef.current = c;
    _setConn(c);
  };

  const [video, _setVideo] = useState<VideoState>("none");
  const videoRef = useRef<VideoState>(video);
  const setVideo = (v: VideoState) => {
    videoRef.current = v;
    _setVideo(v);
  };

  const peerRef = useRef<PeerSession | null>(null);
  const secretRef = useRef("");
  const msgId = useRef(0);
  const requestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showNotice(text: string) {
    setNotice(text);
    window.setTimeout(() => setNotice(null), 3500);
  }

  function postSignal(toId: string, type: SignalMsg["type"] | "offer" | "answer" | "ice", payload?: string) {
    return sendSignal(sessionId, toId, type, payload, secretRef.current);
  }

  function addMessage(mine: boolean, text: string) {
    setMessages((prev) => [...prev, { id: msgId.current++, mine, text }]);
  }

  function teardown(message?: string) {
    if (requestTimer.current) clearTimeout(requestTimer.current);
    peerRef.current?.close();
    peerRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setVideo("none");
    setMessages([]);
    setConn({ kind: "idle" });
    if (message) showNotice(message);
  }

  function startPeer(peerId: string, initiator: boolean) {
    const ps = new PeerSession(initiator, {
      onSignal: (type: DescType, payload: string) => {
        void postSignal(peerId, type, payload);
      },
      onChat: (text) => addMessage(false, text),
      onControl: (ctrl) => handleControl(ctrl),
      onRemoteStream: (stream) => setRemoteStream(stream),
      onConnectionState: (state) => {
        if (state === "failed") {
          teardown("Connection failed (network).");
        }
      },
      onChannelOpen: () => {
        setConn({ kind: "connected", peerId });
      },
    });
    peerRef.current = ps;
  }

  function handleControl(ctrl: PeerControl) {
    const ps = peerRef.current;
    switch (ctrl) {
      case "video-request":
        if (videoRef.current === "none") setVideo("incoming");
        break;
      case "video-accept":
        if (videoRef.current === "requesting" && ps) {
          ps.startVideo()
            .then((stream) => {
              setLocalStream(stream);
              setVideo("active");
            })
            .catch(() => {
              setVideo("none");
              ps.sendControl("video-end");
              showNotice("Camera unavailable.");
            });
        }
        break;
      case "video-decline":
        if (videoRef.current === "requesting") {
          setVideo("none");
          showNotice("Video declined.");
        }
        break;
      case "video-end":
        ps?.stopVideo();
        setLocalStream(null);
        setRemoteStream(null);
        setVideo("none");
        break;
    }
  }

  function declineAllIncoming() {
    for (const request of incomingRef.current) {
      void postSignal(request.peerId, "decline");
    }
    setIncoming([]);
  }

  function requestConnection(peerId: string) {
    if (connRef.current.kind !== "idle") return;
    if (incomingRef.current.some((request) => request.peerId === peerId)) {
      setDotPromptId(peerId);
      return;
    }
    setDotPromptId(null);
    declineAllIncoming();
    setConn({ kind: "requesting", peerId });
    void postSignal(peerId, "request");
    requestTimer.current = setTimeout(() => {
      if (
        connRef.current.kind === "requesting" &&
        connRef.current.peerId === peerId
      ) {
        void postSignal(peerId, "end");
        teardown("No answer.");
      }
    }, REQUEST_TIMEOUT_MS);
  }

  function cancelRequest() {
    if (connRef.current.kind === "requesting") {
      void postSignal(connRef.current.peerId, "end");
    }
    teardown();
  }

  async function acceptIncoming(peerId: string) {
    if (connRef.current.kind !== "idle") return;
    setDotPromptId(null);
    const others = incomingRef.current.filter((request) => request.peerId !== peerId);
    setIncoming([]);
    setConn({ kind: "connecting", peerId });
    startPeer(peerId, false);
    // Decline the rest before accepting. A later decline would clear `busy`
    // for this session too.
    for (const request of others) {
      await postSignal(request.peerId, "decline");
    }
    await postSignal(peerId, "accept");
  }

  function declineIncoming(peerId: string) {
    setDotPromptId((current) => (current === peerId ? null : current));
    void postSignal(peerId, "decline");
    setIncoming(incomingRef.current.filter((request) => request.peerId !== peerId));
  }

  function endConnection() {
    const c = connRef.current;
    if (c.kind === "connecting" || c.kind === "connected") {
      void postSignal(c.peerId, "end");
    }
    teardown();
  }

  function startVideoRequest() {
    if (videoRef.current !== "none" || !peerRef.current) return;
    setVideo("requesting");
    peerRef.current.sendControl("video-request");
  }

  function acceptVideo() {
    const ps = peerRef.current;
    if (!ps) return;
    ps.startVideo()
      .then((stream) => {
        setLocalStream(stream);
        ps.sendControl("video-accept");
        setVideo("active");
      })
      .catch(() => {
        ps.sendControl("video-decline");
        setVideo("none");
        showNotice("Camera unavailable.");
      });
  }

  function declineVideo() {
    peerRef.current?.sendControl("video-decline");
    setVideo("none");
  }

  function endVideo() {
    const ps = peerRef.current;
    ps?.stopVideo();
    ps?.sendControl("video-end");
    setLocalStream(null);
    setRemoteStream(null);
    setVideo("none");
  }

  function processSignal(sig: SignalMsg) {
    switch (sig.type) {
      case "request": {
        if (connRef.current.kind !== "idle") {
          void postSignal(sig.fromId, "decline");
          break;
        }
        if (incomingRef.current.some((request) => request.peerId === sig.fromId)) {
          break;
        }
        setIncoming([...incomingRef.current, { peerId: sig.fromId }]);
        break;
      }
      case "accept": {
        const c = connRef.current;
        if (c.kind === "requesting" && c.peerId === sig.fromId) {
          if (requestTimer.current) clearTimeout(requestTimer.current);
          startPeer(sig.fromId, true);
          setConn({ kind: "connecting", peerId: sig.fromId });
        }
        break;
      }
      case "decline": {
        const c = connRef.current;
        if (c.kind === "requesting" && c.peerId === sig.fromId) {
          if (requestTimer.current) clearTimeout(requestTimer.current);
          teardown("Request declined.");
        }
        break;
      }
      case "offer":
      case "answer":
      case "ice": {
        const c = connRef.current;
        const peerId =
          c.kind === "connecting" || c.kind === "connected" ? c.peerId : null;
        if (peerRef.current && peerId === sig.fromId) {
          void peerRef.current.handleSignal(
            sig.type as DescType,
            sig.payload ?? "",
          );
        }
        break;
      }
      case "end": {
        if (incomingRef.current.some((request) => request.peerId === sig.fromId)) {
          setIncoming(
            incomingRef.current.filter((request) => request.peerId !== sig.fromId),
          );
          setDotPromptId((current) => (current === sig.fromId ? null : current));
        }
        const c = connRef.current;
        if (
          (c.kind === "connecting" || c.kind === "connected") &&
          c.peerId === sig.fromId
        ) {
          teardown("Stranger disconnected.");
        }
        break;
      }
    }
  }

  const processSignalRef = useRef(processSignal);
  useEffect(() => {
    processSignalRef.current = processSignal;
  });

  useEffect(() => {
    if (phase !== "live" || !sessionId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const data = await poll(sessionId, secretRef.current);
        if (!active) return;
        setPeers(data.peers);
        for (const s of data.signals) processSignalRef.current(s);
      } catch {}
      if (active) timer = setTimeout(tick, POLL_INTERVAL_MS);
    };
    tick();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [phase, sessionId]);

  useEffect(() => {
    if (!sessionId || phase !== "live") return;
    const onLeave = () => leave(sessionId, secretRef.current);
    window.addEventListener("pagehide", onLeave);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("pagehide", onLeave);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [sessionId, phase]);

  async function handleReady(name: string, gender: Gender, lat: number, lng: number) {
    setMyGender(gender);
    setMyLocation({ lat, lng });
    secretRef.current = await join(sessionId, name, gender, lat, lng);
    setPhase("live");
  }

  function nameFor(id: string) {
    return peers.find((p) => p.id === id)?.name || "Stranger";
  }

  function genderFor(id: string) {
    return peers.find((p) => p.id === id)?.gender ?? null;
  }

  if (phase === "gate") {
    return <EntryGate onReady={handleReady} />;
  }

  const inChat = conn.kind === "connecting" || conn.kind === "connected";

  return (
    <main className="fixed inset-0 overflow-hidden">
      <WorldMap
        peers={peers}
        me={myLocation}
        meGender={myGender}
        onPeerClick={requestConnection}
        canConnect={conn.kind === "idle"}
      />

      {notice && (
        <div className="ui-toast absolute left-1/2 top-16 z-30 -translate-x-1/2 rounded-full px-4 py-2 text-sm">
          {notice}
        </div>
      )}

      {conn.kind === "requesting" && (
        <div className="ui-toast absolute left-1/2 top-16 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full px-4 py-2 text-sm">
          <span>Requesting connection…</span>
          <button onClick={cancelRequest} className="ui-btn ui-btn-ghost px-3 py-1 text-xs">
            Cancel
          </button>
        </div>
      )}

      {dotPromptId &&
        incoming.some((request) => request.peerId === dotPromptId) && (
          <ConnectionPrompt
            title={`${nameFor(dotPromptId)} already requested you`}
            subtitle="Accept to connect, or decline."
            acceptLabel="Accept"
            declineLabel="Decline"
            onAccept={() => {
              void acceptIncoming(dotPromptId);
            }}
            onDecline={() => declineIncoming(dotPromptId)}
          />
        )}

      <RequestList
        requests={incoming.map((request) => ({
          peerId: request.peerId,
          name: nameFor(request.peerId),
          gender: genderFor(request.peerId),
        }))}
        onAccept={(peerId) => {
          void acceptIncoming(peerId);
        }}
        onDecline={declineIncoming}
      />

      {inChat && (
        <ChatPanel
          peerName={nameFor(conn.peerId)}
          peerGender={genderFor(conn.peerId)}
          messages={messages}
          connected={conn.kind === "connected"}
          videoBusy={video !== "none"}
          onSend={(text) => {
            peerRef.current?.sendChat(text);
            addMessage(true, text);
          }}
          onStartVideo={startVideoRequest}
          onEnd={endConnection}
        />
      )}

      {video === "requesting" && (
        <div className="ui-toast absolute bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full px-4 py-2 text-sm md:left-[calc(50%-14rem)]">
          Waiting for stranger to accept video…
        </div>
      )}

      {video === "incoming" && (
        <ConnectionPrompt
          title="Start video call?"
          subtitle="The stranger wants to turn on video."
          acceptLabel="Accept"
          declineLabel="Decline"
          onAccept={acceptVideo}
          onDecline={declineVideo}
        />
      )}

      {video === "active" && (
        <VideoPanel
          localStream={localStream}
          remoteStream={remoteStream}
          onEnd={endVideo}
        />
      )}
    </main>
  );
}

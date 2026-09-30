Development Setup:
- Was not listed in documentation where it should need generate prisma that's why having Error: Failed to load external module @prisma/client-2c3a283f134fdcb6: Error: Cannot find module '.prisma/client/default' when running npm run dev; It was fixed by running the `npx prisma generate`


BUGS:
1. Kill one window without letting it unload: end that browser process in Task Manager, or in that tab's DevTools set Network to Offline and then close it. Either way /api/leave never runs. 
2. Chat never arrives in lib/webrtc.ts. The sender uses t: "msg" and the receiver only accepts t: "chat".
3. Hanging up leaves both people busy. Accepting a chat sets `busy` to true, but `end` never sets it back to false, so the next request gets declined.
4. Chat stays on Connecting… because ICE candidates were applied before the remote description, so the browser threw them away and the data channel never opened.


FIX:
1. on line 25-28 /api/poll Updating only one base on Id soo it will update your precense lastSeen to the latest and those old precense that not your's will get removed
2. Replace the "msg" to "chat"
3. adding the `end` connection to condition for set back busy to false.
4. on line 110-111 lib/webrtc.ts call `setRemoteDescription` first, then `flushPendingCandidates`, so the queued ICE candidates are added after the offer or answer is set.

Added FEATURE:
1. Added a popup after Enter Pulse asking if you are 18 or older, to protect minors. Yes continues. No shows Not allowed.
2. Added a gender selection soo we know if we are talking to a girl or boy
3. Added Report mechanism to block user if them was reported multiple times. to prevent inapropriate chatting.
4. Show list of request you can received multiple request also you can reject or accept them
5. added a top overlay shows how many currently online 

PHASE 3 — security:
Ranked by what I would block before launch.
1. High: poll returns every dot's session id, and that same id was the only credential. Anyone on the map could poll as you (steal the call setup), leave as you, or send signals as you. Fixed: join returns a secret that is never shown to other dots. Poll, signal, and leave require it.
2. High: accept/decline/end flipped `busy` for any two ids, so a stranger could lock someone into "busy" or free someone who is already in a call. Fixed: a request is stored as a knock; accept works only for that knock; decline of someone else no longer clears an active call; end only clears the pair that is actually connected.
3. Medium: signal, poll, and leave accepted any string as an id, and one session could fill another mailbox. Fixed: ids must be uuids, signal payloads stay capped, and one session can send at most 80 signals a minute.
4. Low: display names were not stripped of control characters. Fixed on join.
Not done: there is still no account login, on purpose. The secret only lasts for the session. Edge rate limiting (a shared limiter in front of the app) would still help against a flood of brand-new joins.
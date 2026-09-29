Development Setup:
- Was not listed in documentation where it should need generate prisma that's why having Error: Failed to load external module @prisma/client-2c3a283f134fdcb6: Error: Cannot find module '.prisma/client/default' when running npm run dev; It was fixed by running the `npx prisma generate`


BUGS:
1. Kill one window without letting it unload: end that browser process in Task Manager, or in that tab's DevTools set Network to Offline and then close it. Either way /api/leave never runs. 
2. Chat never arrives in lib/webrtc.ts. The sender uses t: "msg" and the receiver only accepts t: "chat".


FIX:
1. on line 25-28 /api/poll Updating only one base on Id soo it will update your precense lastSeen to the latest and those old precense that not your's will get removed
2. Replace the "msg" to "chat"
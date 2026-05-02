# Activity Rooms

Mobile-first multiplayer Activity-style board game with online rooms for up to 8 players, playable from different devices.

## Features

- Create or join a room with a 5-character code.
- Up to 8 players per room, played as pairs.
- Start requires 4, 6, or 8 players so every player has a teammate.
- Real-time turns over Socket.IO.
- Serbian and English UI and cards.
- Describe, draw, and mime categories.
- 48 activity spots plus start and finish.
- Difficulty cards worth 3, 4, or 5 movement points.
- Generated bilingual decks with 1,000 terms for every activity/difficulty combination.
- 9,000 English terms and 9,000 Serbian terms are available at runtime.
- Landing on a tile sets that pair's next activity.
- If a pair lands on another pair, the pair already there moves one spot back.
- Red/special terms are all-play: current pair gets +6 if they guess, or another pair gets +6 while the current pair still gets +3.
- Mobile-first board, timer, pair positions, lobby, host controls.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000`. For testing on phones on the same Wi-Fi, use the computer's local network IP with port `3000`.

## Host online

This app is ready for a Node.js host such as Render, Railway, Fly.io, or a VPS.

## Deploy on Render Free

1. Push this project to GitHub.
2. Open Render and create a new Web Service.
3. Connect the GitHub repository.
4. Use these settings:

- Runtime: `Node`
- Build command: `npm install`
- Start command: `npm start`
- Instance type: `Free`

The included `render.yaml` can also be used as a Render Blueprint.

Use:

- Build command: `npm install`
- Start command: `npm start`
- Port: read from `process.env.PORT`

The current MVP keeps rooms in memory. That is simple and fast, but rooms disappear when the server restarts. For production, add Redis or a database if you need persistent rooms, horizontal scaling, or reconnects after deploys.

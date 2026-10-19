# Hazari Scoreboard

A lightweight, responsive scorekeeper for four-player Hazari games. Player names, hand scores, and match history are saved in the browser on the current device.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Keep score

1. Edit the four player names on the leaderboard.
2. Enter each player's points for a hand and choose **Add hand**. Scores may be negative.
3. Use **Undo last** to remove the most recently added hand, or **Export** to download a CSV of the hand scores.
4. Choose **New game** to clear the match after confirming.

Each hand totals 360 points. The app calculates a missing fourth score from any three entered scores. With two scores, it only fills the other two when you confirm that they tied and the remaining points divide evenly. Match data stays in this browser's local storage; it is not synced to other devices.

Choose **Finish match** to save the winner, final totals, date, and all hand scores to match history, then start the next match. Tied winners are recorded together.

## Production

```bash
npm run build
npm start
```

## Deploy to Vercel

1. Import this repository in Vercel.
2. Set **Root Directory** to `hazari-scoreboard` (the Next.js app is in this folder).
3. Keep the detected Next.js framework settings. Vercel will use `npm run build`; no environment variables are required.

Match and score history is stored in each visitor's browser, so it stays on that device and browser after deployment.

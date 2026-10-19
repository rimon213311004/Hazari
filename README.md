<div align="center">

# Hazari Scoreboard

### Four players. One table. Every point accounted for.

<p>
  <img src="./assets/hazari-dashboard.svg" alt="A 3D-inspired Hazari scoreboard showing four players, their scores, and a leading player" width="100%" />
</p>

<p>
  <img src="https://img.shields.io/badge/Next.js-16-20231f?style=flat-square&logo=next.js&logoColor=white" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-20231f?style=flat-square&logo=react&logoColor=61DAFB" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-20231f?style=flat-square&logo=typescript&logoColor=3178C6" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Made%20by-Rimon-315d4b?style=flat-square" alt="Made by Rimon" />
</p>

[Open the live scoreboard](https://hazari-git-main-rimon5.vercel.app/) · [Play locally](#run-locally) · [Scoring rules](#automatic-scoring) · [Deploy to Vercel](#deploy-to-vercel)

</div>

---

Hazari is a responsive, shared scorekeeper for four-player card nights. Add hands as you play, follow the leaderboard live across visitors, and keep the winner and full hand history when a match ends.

## At the table

| Keep track | Play anywhere | Follow the same table |
| --- | --- | --- |
| Live player totals, round-by-round scores, ties, and match winners. | A responsive layout for phones, tablets, laptops, and desktops. | Visitors see and edit the same match and history in real time. |

### Automatic scoring

Each hand has **360 points**. Enter any three player scores and Hazari fills in the fourth. With two scores entered, it only calculates the other two if you explicitly confirm they tied and the remainder divides evenly. It never guesses missing scores.

### A match from first hand to winner

1. Give the four seats player names.
2. Enter hand scores. The 360-point total updates as you type.
3. Add the hand to update the table and hand history.
4. Choose **Finish match** to save the winner, final totals, date, and every hand. Tied winners are saved together.

## Run locally

```bash
cd hazari-scoreboard
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

Live site: [hazari-git-main-rimon5.vercel.app](https://hazari-git-main-rimon5.vercel.app/).

The live scoreboard uses MongoDB Atlas. Create an Atlas database and user, allow your deployment in Atlas Network Access, then set the connection string as `MONGODB_URI` in `hazari-scoreboard/.env.local` and in Vercel. Keep this secret server-side; do not add a `NEXT_PUBLIC_` prefix or commit it.

Import this repository in Vercel and set **Root Directory** to `hazari-scoreboard`. Keep the detected Next.js settings and add `MONGODB_URI` for Production, Preview, and Development, then redeploy. Without this variable, the app runs in local-only mode.

> The shared board is public and editable by anyone who visits it, including the ability to finish or reset a match. Do not use it for private or sensitive information.

## Production build

```bash
npm run build
npm start
```

<div align="center">

Made for the love of the game · **Developed by Rimon**

</div>

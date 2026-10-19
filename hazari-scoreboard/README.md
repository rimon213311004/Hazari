<div align="center">

# Hazari Scoreboard

### A little more clarity around the table.

<img src="../assets/hazari-dashboard.svg" alt="3D-inspired preview of the Hazari four-player scoreboard" width="100%" />

**Four players | 360 points per hand | One live scoreboard for everyone**

[Open the live scoreboard](https://hazari-git-main-rimon5.vercel.app/)

</div>

## Get started

From this folder, run:

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## How a hand is scored

Every hand adds up to **360 points**. Enter any three players' scores and the fourth is calculated automatically. With only two scores entered, Hazari waits for more information. If you know the other two players tied, confirm the tie; it will calculate their points only when the remainder divides evenly into whole numbers.

## Save a match

Choose **Finish match** to record the date, winner or tied winners, final totals, and all hand scores. Expand a saved match in **Match history** to review each hand. With MongoDB Atlas configured, all visitors see and edit this same board; updates appear within a couple of seconds.

## Deploy to Vercel

Live site: [hazari-git-main-rimon5.vercel.app](https://hazari-git-main-rimon5.vercel.app/). Create a MongoDB Atlas database and user, allow your deployment in Atlas Network Access, and set the connection string as `MONGODB_URI` in `.env.local` locally and in Vercel. See `.env.example` for the format. Keep this secret server-side; do not add a `NEXT_PUBLIC_` prefix or commit `.env.local`.

Import the repository in Vercel and set **Root Directory** to `hazari-scoreboard`; keep the detected Next.js framework settings. Add `MONGODB_URI` for Production, Preview, and Development, then redeploy. Without it, the app stays in local-only mode. With it, the shared board is public and anyone can edit or reset it.

Shared match history is stored in MongoDB Atlas and is visible to every visitor.

## Production build

```bash
npm run build
npm start
```

<div align="center">

**Developed by Rimon**

</div>

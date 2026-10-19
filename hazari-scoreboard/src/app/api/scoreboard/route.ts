import { NextResponse } from "next/server";
import getMongoClient from "@/lib/mongodb";

type SharedState = {
  game: { players: string[]; rounds: { id: number; scores: number[] }[] };
  matches: { id: number; number: number; completedAt: string; players: string[]; rounds: { id: number; scores: number[] }[]; totals: number[] }[];
};

const initial: SharedState = {
  game: { players: ["Player 1", "Player 2", "Player 3", "Player 4"], rounds: [] },
  matches: [],
};

function validState(value: unknown): value is SharedState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<SharedState>;
  if (!state.game || !Array.isArray(state.game.players) || state.game.players.length !== 4 || !state.game.players.every((name) => typeof name === "string" && name.length <= 40)) return false;
  const validRounds = (rounds: unknown) => Array.isArray(rounds) && rounds.every((round) => {
    if (!round || typeof round !== "object") return false;
    const entry = round as { id?: unknown; scores?: unknown };
    return typeof entry.id === "number" && Number.isSafeInteger(entry.id) && Array.isArray(entry.scores) && entry.scores.length === 4 && entry.scores.every((score) => Number.isInteger(score) && score >= 0 && score <= 360) && entry.scores.reduce((a, b) => a + b, 0) === 360;
  });
  if (!validRounds(state.game.rounds) || !Array.isArray(state.matches)) return false;
  return state.matches.length <= 10000 && state.matches.every((match) => {
    if (!match || typeof match !== "object") return false;
    const item = match as SharedState["matches"][number];
    return Array.isArray(item.players) && item.players.length === 4 && item.players.every((name) => typeof name === "string" && name.length <= 40)
      && Array.isArray(item.totals) && item.totals.length === 4 && item.totals.every((total) => Number.isInteger(total) && total >= 0)
      && validRounds(item.rounds) && typeof item.completedAt === "string";
  });
}

export async function GET() {
  if (!process.env.MONGODB_URI) return NextResponse.json({ configured: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  try {
    const client = await getMongoClient();
    const collection = client.db("hazari").collection<SharedState & { _id: string }>("shared_scoreboard");
    await collection.updateOne({ _id: "main" }, { $setOnInsert: { ...initial, updatedAt: new Date() } }, { upsert: true });
    const state = await collection.findOne({ _id: "main" }, { projection: { _id: 0, updatedAt: 0 } });
    return NextResponse.json(state ?? initial, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not load the shared scoreboard." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function PUT(request: Request) {
  if (!process.env.MONGODB_URI) return NextResponse.json({ configured: false }, { status: 503 });
  try {
    const body = await request.json();
    if (!validState(body)) return NextResponse.json({ error: "Invalid scoreboard data." }, { status: 400 });
    const client = await getMongoClient();
    await client.db("hazari").collection<SharedState & { _id: string }>("shared_scoreboard").updateOne(
      { _id: "main" },
      { $set: { game: body.game, matches: body.matches, updatedAt: new Date() } },
      { upsert: true },
    );
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not save the shared scoreboard." }, { status: 503 });
  }
}

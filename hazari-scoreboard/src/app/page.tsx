"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Round = { id: number; scores: number[] };
type Game = { players: string[]; rounds: Round[] };
type CompletedMatch = { id: number; number: number; completedAt: string; players: string[]; rounds: Round[]; totals: number[] };
type SharedState = { game: Game; matches: CompletedMatch[] };
type SyncStatus = "local" | "connecting" | "live" | "saving" | "offline";
const initial: Game = { players: ["Player 1", "Player 2", "Player 3", "Player 4"], rounds: [] };
const storageKey = "hazari-scoreboard-v1";
const matchHistoryKey = "hazari-match-history-v1";

function getWinners(scores: number[]) {
  const highScore = Math.max(...scores);
  return scores.flatMap((score, index) => score === highScore ? [index] : []);
}

function isSharedState(value: unknown): value is SharedState {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<SharedState>;
  return Array.isArray(data.game?.players) && data.game.players.length === 4 && Array.isArray(data.game.rounds) && Array.isArray(data.matches);
}

function Icon({ name }: { name: "cards" | "plus" | "undo" | "trash" | "crown" | "download" }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "cards") return <svg {...common}><rect x="5" y="4" width="12" height="16" rx="2"/><path d="M9 2h9a2 2 0 0 1 2 2v13M9 9h4m-4 4h4"/></svg>;
  if (name === "plus") return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
  if (name === "undo") return <svg {...common}><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-2"/></svg>;
  if (name === "trash") return <svg {...common}><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/></svg>;
  if (name === "crown") return <svg {...common}><path d="m2 8 5 4 5-8 5 8 5-4-2 12H4L2 8Z"/></svg>;
  return <svg {...common}><path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4"/></svg>;
}

export default function Home() {
  const [game, setGame] = useState<Game>(initial);
  const [matches, setMatches] = useState<CompletedMatch[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("connecting");
  const [draft, setDraft] = useState(["", "", "", ""]);
  const [remainingPlayersTied, setRemainingPlayersTied] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const lastSharedSnapshot = useRef<string | null>(null);
  const sharedWriteQueue = useRef<Promise<void>>(Promise.resolve());
  const currentSharedState = useRef<SharedState>({ game: initial, matches: [] });
  currentSharedState.current = { game, matches };

  useEffect(() => {
    let active = true;
    const loadLocalCopy = () => {
      let nextGame = initial;
      let nextMatches: CompletedMatch[] = [];
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved) as Game;
          if (parsed.players?.length === 4 && Array.isArray(parsed.rounds)) nextGame = parsed;
        }
        const savedMatches = localStorage.getItem(matchHistoryKey);
        if (savedMatches) {
          const parsedMatches = JSON.parse(savedMatches) as CompletedMatch[];
          if (Array.isArray(parsedMatches)) nextMatches = parsedMatches.filter((match) => match.players?.length === 4 && Array.isArray(match.rounds) && match.totals?.length === 4);
        }
      } catch { /* Start a fresh match if saved data is unreadable. */ }
      setGame(nextGame);
      setMatches(nextMatches);
      currentSharedState.current = { game: nextGame, matches: nextMatches };
      lastSharedSnapshot.current = JSON.stringify({ game: nextGame, matches: nextMatches });
    };
    const applySharedState = (shared: SharedState) => {
      lastSharedSnapshot.current = JSON.stringify(shared);
      currentSharedState.current = shared;
      setGame(shared.game);
      setMatches(shared.matches);
      setSyncStatus("live");
    };
    const loadSharedState = async (initialLoad: boolean) => {
      try {
        const response = await fetch("/api/scoreboard", { cache: "no-store" });
        if (!active) return;
        if (response.status === 503) {
          const body = await response.json().catch(() => null);
          if (body?.configured === false) {
            if (initialLoad) { loadLocalCopy(); setSyncStatus("local"); }
          } else {
            setSyncStatus("offline");
            if (initialLoad) loadLocalCopy();
          }
          return;
        }
        if (!response.ok) throw new Error("Shared scoreboard unavailable");
        const shared: unknown = await response.json();
        if (!isSharedState(shared)) throw new Error("Invalid shared scoreboard");
        if (initialLoad || JSON.stringify(currentSharedState.current) === lastSharedSnapshot.current) applySharedState(shared);
      } catch {
        if (!active) return;
        setSyncStatus("offline");
        if (initialLoad) loadLocalCopy();
      } finally {
        if (active && initialLoad) setLoaded(true);
      }
    };
    void loadSharedState(true);
    const poll = window.setInterval(() => { if (loaded) void loadSharedState(false); }, 1800);
    return () => { active = false; window.clearInterval(poll); };
  }, [loaded]);

  useEffect(() => {
    if (loaded) localStorage.setItem(storageKey, JSON.stringify(game));
  }, [game, loaded]);

  useEffect(() => {
    if (loaded) localStorage.setItem(matchHistoryKey, JSON.stringify(matches));
  }, [matches, loaded]);

  useEffect(() => {
    if (!loaded || syncStatus === "local") return;
    const payload: SharedState = { game, matches };
    const snapshot = JSON.stringify(payload);
    if (snapshot === lastSharedSnapshot.current) return;

    const timeout = window.setTimeout(() => {
      setSyncStatus("saving");
      sharedWriteQueue.current = sharedWriteQueue.current.then(async () => {
        const response = await fetch("/api/scoreboard", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: snapshot,
        });
        if (!response.ok) {
          setSyncStatus("offline");
          return;
        }
        lastSharedSnapshot.current = snapshot;
        setSyncStatus("live");
      }).catch(() => setSyncStatus("offline"));
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [game, matches, loaded, syncStatus]);

  const totals = useMemo(() => game.players.map((_, i) => game.rounds.reduce((sum, round) => sum + (round.scores[i] || 0), 0)), [game]);
  const leader = Math.max(...totals);
  const winners = game.rounds.length ? totals.map((score, i) => score === leader ? i : -1).filter((i) => i >= 0) : [];

  const enteredIndices = draft.flatMap((value, i) => value.trim() === "" ? [] : [i]);
  const hasInvalidScore = draft.some((value) => value.trim() !== "" && (!Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) > 360));
  const enteredTotal = enteredIndices.reduce((sum, i) => sum + Number(draft[i]), 0);
  const unresolvedIndices = draft.flatMap((value, i) => value.trim() === "" ? [i] : []);
  const resolvedDraft: (number | null)[] = draft.map((value) => value.trim() === "" ? null : Number(value));
  const calculatedIndices = new Set<number>();
  let calculationMessage = "Enter scores for any 3 players; the last score will be calculated from 360.";

  if (hasInvalidScore) {
    calculationMessage = "Use whole-number scores from 0 to 360.";
  } else if (enteredIndices.length === 3) {
    const remainder = 360 - enteredTotal;
    if (remainder >= 0 && remainder <= 360) {
      resolvedDraft[unresolvedIndices[0]] = remainder;
      calculatedIndices.add(unresolvedIndices[0]);
      calculationMessage = `${game.players[unresolvedIndices[0]].trim() || `Player ${unresolvedIndices[0] + 1}`} gets ${remainder} points. Hand total: 360.`;
    } else {
      calculationMessage = "Those scores exceed 360. Adjust a score to continue.";
    }
  } else if (enteredIndices.length === 2 && remainingPlayersTied) {
    const remainder = 360 - enteredTotal;
    if (remainder >= 0 && remainder % 2 === 0) {
      const eachScore = remainder / 2;
      unresolvedIndices.forEach((i) => { resolvedDraft[i] = eachScore; calculatedIndices.add(i); });
      calculationMessage = `The remaining players are tied at ${eachScore} points each. Hand total: 360.`;
    } else if (remainder < 0) {
      calculationMessage = "Those scores exceed 360. Adjust a score to continue.";
    } else {
      calculationMessage = "The remaining total cannot be split into equal whole-number scores. Enter one more score instead.";
    }
  } else if (enteredIndices.length === 2) {
    calculationMessage = "Two scores leave two unknown. Enter one more score, or confirm the remaining players tied.";
  } else if (enteredIndices.length === 4) {
    calculationMessage = enteredTotal === 360 ? "Hand total: 360. Ready to add." : `The four scores total ${enteredTotal}; they must total 360.`;
  }

  const canAddRound = !hasInvalidScore && resolvedDraft.every((score) => score !== null) && resolvedDraft.reduce<number>((sum, score) => sum + (score ?? 0), 0) === 360;

  function addRound(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canAddRound) return;
    setGame((current) => ({ ...current, rounds: [...current.rounds, { id: Date.now(), scores: resolvedDraft as number[] }] }));
    setDraft(["", "", "", ""]);
    setRemainingPlayersTied(false);
  }

  function updatePlayer(index: number, name: string) {
    setGame((current) => ({ ...current, players: current.players.map((player, i) => i === index ? name : player) }));
  }

  function reset() {
    setGame({ players: ["Player 1", "Player 2", "Player 3", "Player 4"], rounds: [] });
    setDraft(["", "", "", ""]);
    setRemainingPlayersTied(false);
    setConfirmReset(false);
  }

  function finishMatch() {
    if (game.rounds.length === 0) return;
    const record: CompletedMatch = {
      id: Date.now(),
      number: matches.length + 1,
      completedAt: new Date().toISOString(),
      players: [...game.players],
      rounds: game.rounds.map((round) => ({ ...round, scores: [...round.scores] })),
      totals: [...totals],
    };
    setMatches((current) => [record, ...current]);
    setGame(initial);
    setDraft(["", "", "", ""]);
    setRemainingPlayersTied(false);
    setConfirmFinish(false);
  }

  function exportScores() {
    const escapeCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const rows = [["Hand", ...game.players], ...game.rounds.map((round, index) => [index + 1, ...round.scores])];
    const csv = rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "hazari-scoreboard.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="Hazari home"><span className="brand-mark"><Icon name="cards" /></span><span>hazari<span className="brand-dot">.</span></span></a>
        <div className="topbar-right"><span className={`live-dot sync-${syncStatus}`} /><span className="sync-label">{syncStatus === "live" ? "LIVE SHARED" : syncStatus === "saving" ? "SYNCING" : syncStatus === "connecting" ? "CONNECTING" : syncStatus === "offline" ? "OFFLINE · LOCAL COPY" : "LOCAL ONLY"}</span><span className="topbar-divider" /> MATCH {String(matches.length + 1).padStart(2, "0")} <span className="topbar-divider" /> <span className="round-counter">{matches.length} COMPLETED</span> <span className="topbar-divider" /> <span className="round-counter">{game.rounds.length} {game.rounds.length === 1 ? "ROUND" : "ROUNDS"}</span></div>
      </header>

      <section className="hero" id="home">
        <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line" /> THE TABLE IS YOURS</div><h1>Keep score.<br /><span>Keep the bragging rights.</span></h1><p>A simple, beautiful scoreboard for your next Hazari night.</p></div>
        <div className="hero-stats"><div className="stat-label">TOTAL HANDS</div><div className="stat-number">{String(game.rounds.length).padStart(2, "0")}</div><div className="stat-caption">{game.rounds.length ? "And counting" : "Ready when you are"}</div><div className="stat-decoration">♠ <span>♥</span> ♣ <span>♦</span></div></div>
      </section>

      <section className="players-section" aria-labelledby="players-title">
        <div className="players-section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> MAKE IT YOUR TABLE</div><h2 id="players-title">Who&apos;s playing?</h2></div><p>Enter names like Rimon or Korim. You can change them anytime.</p></div>
        <div className="name-grid">{game.players.map((player, i) => <div className="name-field" key={i}><label htmlFor={`player-${i}`}><span className={`mini-suit suit-${i}`}>{["♠", "♥", "♣", "♦"][i]}</span> PLAYER {i + 1}</label><input id={`player-${i}`} value={player} maxLength={22} placeholder={`Player ${i + 1}`} onChange={(event) => updatePlayer(i, event.target.value)} /></div>)}</div>
      </section>

      <section className="scoreboard-section">
        <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> THE LEADERBOARD</div><h2>The table</h2></div><div className="section-actions">{game.rounds.length > 0 && <><button className="quiet-button finish-button" onClick={() => setConfirmFinish(true)}><Icon name="crown" /> Finish match</button><button className="quiet-button" onClick={exportScores}><Icon name="download" /> Export</button><button className="quiet-button" onClick={() => setGame((current) => ({ ...current, rounds: current.rounds.slice(0, -1) }))}><Icon name="undo" /> Undo last</button></>}<button className="quiet-button reset-button" onClick={() => setConfirmReset(true)}><Icon name="trash" /> New game</button></div></div>
        <div className="score-grid">
          {game.players.map((player, i) => <article className={`player-card player-${i + 1} ${winners.includes(i) ? "is-leading" : ""}`} key={i}>
            <div className="player-card-top"><span className="player-index">0{i + 1}</span>{winners.includes(i) && <span className="leader-badge"><Icon name="crown" /> LEADING</span>}</div>
            <div className="player-name">{player.trim() || `Player ${i + 1}`}</div>
            <div className="player-score">{totals[i].toLocaleString()}</div><div className="score-caption">TOTAL POINTS</div>
            <div className="player-card-bottom"><span className="player-suit">{["♠", "♥", "♣", "♦"][i]}</span><span>{game.rounds.length ? `${game.rounds.length} ${game.rounds.length === 1 ? "hand" : "hands"} played` : "Awaiting first hand"}</span></div>
          </article>)}
        </div>
      </section>

      <section className="round-section">
        <div className="section-heading round-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> PLAY BY PLAY</div><h2>Score a hand</h2></div><p>Enter each player&apos;s points to add a new hand.</p></div>
        <form className="entry-card" onSubmit={addRound}>
          <div className="entry-head"><div><span className="entry-icon"><Icon name="plus" /></span><div><strong>New hand</strong><span>Each hand adds up to 360 points.</span></div></div><span className="hand-number">HAND {String(game.rounds.length + 1).padStart(2, "0")}</span></div>
          <div className="entry-grid">{game.players.map((player, i) => <div className="score-input-wrap" key={i}><label htmlFor={`score-${i}`}><span className={`mini-suit suit-${i}`}>{["♠", "♥", "♣", "♦"][i]}</span>{player.trim() || `Player ${i + 1}`}{calculatedIndices.has(i) && <span className="calculated-tag">AUTO</span>}</label><input id={`score-${i}`} inputMode="numeric" type="number" min="0" max="360" step="1" placeholder="0" value={calculatedIndices.has(i) ? resolvedDraft[i] ?? "" : draft[i]} readOnly={calculatedIndices.has(i)} onChange={(event) => setDraft((values) => values.map((value, index) => index === i ? event.target.value : value))} /></div>)}</div>
          {enteredIndices.length === 2 && !hasInvalidScore && <label className="tie-option"><input type="checkbox" checked={remainingPlayersTied} onChange={(event) => setRemainingPlayersTied(event.target.checked)} /><span>The two players without scores are tied</span></label>}
          <div className="entry-footer"><span className="points-note"><span className="note-dot" /> {calculationMessage}</span><button className="add-button" type="submit" disabled={!canAddRound}><Icon name="plus" /> Add hand</button></div>
        </form>
      </section>

      <section className="history-section"><div className="history-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> THE RECAP</div><h2>Hand history</h2></div><span className="history-count">{game.rounds.length} {game.rounds.length === 1 ? "hand" : "hands"}</span></div>
        {game.rounds.length ? <div className="history-table"><div className="history-row history-head"><span>HAND</span>{game.players.map((name, i) => <span key={i}>{name.trim() || `Player ${i + 1}`}</span>)}</div>{[...game.rounds].reverse().map((round) => <div className="history-row" key={round.id}><span className="history-hand">#{String(game.rounds.findIndex((r) => r.id === round.id) + 1).padStart(2, "0")}</span>{round.scores.map((score, i) => <span className={score < 0 ? "negative-score" : ""} key={i}>{score > 0 ? `+${score}` : score}</span>)}</div>)}</div> : <div className="empty-history"><span className="empty-icon"><Icon name="cards" /></span><strong>No hands on the table yet</strong><span>Add your first hand above and the story starts here.</span></div>}
      </section>

      <section className="match-history-section" aria-labelledby="match-history-title"><div className="history-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> PAST GAMES</div><h2 id="match-history-title">Match history</h2></div><span className="history-count">{matches.length} {matches.length === 1 ? "match played" : "matches played"}</span></div>
        {matches.length ? <div className="match-list">{matches.map((match) => {
          const matchWinners = getWinners(match.totals);
          const winnerNames = matchWinners.map((index) => match.players[index].trim() || `Player ${index + 1}`);
          return <article className="match-card" key={match.id}>
            <div className="match-card-top"><span className="match-number">MATCH {String(match.number).padStart(2, "0")}</span><time dateTime={match.completedAt}>{new Date(match.completedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</time><span className="match-round-count">{match.rounds.length} {match.rounds.length === 1 ? "hand" : "hands"}</span></div>
            <div className="match-result"><span className="match-crown"><Icon name="crown" /></span><div><span className="match-result-label">{matchWinners.length > 1 ? "TIED WINNERS" : "MATCH WINNER"}</span><strong>{winnerNames.join(" & ")}</strong></div><span className="match-winning-score">{Math.max(...match.totals).toLocaleString()}<small> pts</small></span></div>
            <div className="match-totals">{match.players.map((name, index) => <span className={matchWinners.includes(index) ? "match-total winner-total" : "match-total"} key={index}><span>{name.trim() || `Player ${index + 1}`}</span><strong>{match.totals[index].toLocaleString()}</strong></span>)}</div>
            <details className="match-detail"><summary>View all {match.rounds.length} hand scores</summary><div className="history-table"><div className="history-row history-head"><span>HAND</span>{match.players.map((name, index) => <span key={index}>{name.trim() || `Player ${index + 1}`}</span>)}</div>{match.rounds.map((round, index) => <div className="history-row" key={round.id}><span className="history-hand">#{String(index + 1).padStart(2, "0")}</span>{round.scores.map((score, playerIndex) => <span key={playerIndex}>{score > 0 ? `+${score}` : score}</span>)}</div>)}</div></details>
          </article>;
        })}</div> : <div className="empty-history"><span className="empty-icon"><Icon name="crown" /></span><strong>No finished matches yet</strong><span>Finish a match to save its winner and full hand history here.</span></div>}
      </section>

      <footer className="footer"><a className="brand footer-brand" href="#home"><span className="brand-mark"><Icon name="cards" /></span><span>hazari<span className="brand-dot">.</span></span></a><span className="developer-credit">Developed by <strong>Rimon</strong></span><span className="footer-note">YOUR SCORE IS SAVED ON THIS DEVICE</span></footer>

      {confirmReset && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmReset(false); }}><div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="reset-title"><span className="modal-icon"><Icon name="trash" /></span><h2 id="reset-title">Start a new game?</h2><p>This clears the hand history and resets all four player names and scores.</p><div className="modal-actions"><button className="quiet-button" onClick={() => setConfirmReset(false)}>Keep playing</button><button className="add-button danger-button" onClick={reset}>Start fresh</button></div></div></div>}
      {confirmFinish && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmFinish(false); }}><div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="finish-title"><span className="modal-icon finish-modal-icon"><Icon name="crown" /></span><h2 id="finish-title">Finish this match?</h2><p>{getWinners(totals).map((index) => game.players[index].trim() || `Player ${index + 1}`).join(" & ")} {getWinners(totals).length > 1 ? "are tied at" : "is leading with"} {leader.toLocaleString()} points. The winner and every hand will be saved to match history before a fresh match starts.</p><div className="modal-actions"><button className="quiet-button" onClick={() => setConfirmFinish(false)}>Keep playing</button><button className="add-button" onClick={finishMatch}>Save match &amp; start next</button></div></div></div>}
    </main>
  );
}

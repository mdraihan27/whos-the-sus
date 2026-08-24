"use client";

import { useEffect, useMemo, useState } from "react";

import { PlayerAvatar } from "@/components/player-avatar";
import { Scoreboard } from "@/components/game/scoreboard";
import { WordCard } from "@/components/game/word-card";
import { callApi, messageFrom } from "@/lib/api";
import {
  subscribeToClues,
  subscribeToMatch,
  subscribeToMyRole,
} from "@/lib/game";
import {
  CLUE_MAX,
  type Clue,
  type GameMatch,
  type GameSession,
  type GroupMember,
  type MyRole,
} from "@/lib/game-types";

/** Snapshots are tagged with the match they came from, so a previous match's
 *  data never shows against the new one while the listener re-attaches. */
type Tagged<T> = { matchId: string; value: T };

function useMatchData(groupId: string, matchId: string | null, viewerId: string) {
  const [match, setMatch] = useState<Tagged<GameMatch | null> | null>(null);
  const [clues, setClues] = useState<Tagged<Clue[]> | null>(null);
  const [role, setRole] = useState<Tagged<MyRole | null> | null>(null);

  useEffect(() => {
    if (!matchId) return;
    return subscribeToMatch(
      groupId,
      matchId,
      (value) => setMatch({ matchId, value }),
      () => setMatch({ matchId, value: null }),
    );
  }, [groupId, matchId]);

  useEffect(() => {
    if (!matchId) return;
    return subscribeToClues(
      groupId,
      matchId,
      (value) => setClues({ matchId, value }),
      () => setClues({ matchId, value: [] }),
    );
  }, [groupId, matchId]);

  useEffect(() => {
    if (!matchId) return;
    return subscribeToMyRole(
      groupId,
      matchId,
      viewerId,
      (value) => setRole({ matchId, value }),
      () => setRole({ matchId, value: null }),
    );
  }, [groupId, matchId, viewerId]);

  return {
    match: match?.matchId === matchId ? match.value : null,
    clues: clues?.matchId === matchId ? clues.value : [],
    role: role?.matchId === matchId ? role.value : null,
  };
}

function WaitingOn({
  members,
  waiting,
}: {
  members: Map<string, GroupMember>;
  waiting: string[];
}) {
  if (waiting.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-bubble/80 px-3 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-600">
        Waiting on
      </span>
      {waiting.map((uid) => {
        const member = members.get(uid);
        return member ? (
          <span key={uid} className="flex items-center gap-1.5">
            <PlayerAvatar
              spec={member.avatar}
              size={20}
              className="ring-1 ring-sky-200"
              title={member.name}
            />
            <span className="text-xs text-sky-700">{member.name}</span>
          </span>
        ) : null;
      })}
      <span className="ml-1 flex gap-1">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
      </span>
    </div>
  );
}

function ClueFeed({
  clues,
  members,
  round,
}: {
  clues: Clue[];
  members: Map<string, GroupMember>;
  round: number;
}) {
  const rounds = useMemo(() => {
    const grouped = new Map<number, Clue[]>();
    for (const clue of clues) {
      const list = grouped.get(clue.round) ?? [];
      list.push(clue);
      grouped.set(clue.round, list);
    }
    return [...grouped.entries()].sort((a, b) => a[0] - b[0]);
  }, [clues]);

  if (rounds.length === 0) {
    return (
      <p className="rounded-xl border-2 border-dashed border-border shadow-sm bg-bubble/80 px-4 py-8 text-center text-sm text-sky-600">
        No clues yet. Someone has to go first…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {rounds.map(([roundNumber, list]) => (
        <div key={roundNumber}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-sky-500">
            Round {roundNumber}
            {roundNumber === round ? " · now" : ""}
          </p>
          <div className="space-y-2">
            {list.map((clue) => {
              const member = members.get(clue.uid);
              return (
                <div key={clue.id} className="flex items-center gap-2.5">
                  {member ? (
                    <PlayerAvatar
                      spec={member.avatar}
                      size={30}
                      className="ring-1 ring-sky-200"
                      title={member.name}
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="text-[11px] text-sky-600">
                      {member?.name ?? "Player"}
                    </p>
                    <p className="break-words rounded-2xl rounded-tl-sm bg-bubble px-3.5 py-2 text-sm">
                      {clue.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function GameRoom({
  groupId,
  session,
  members,
  viewerId,
}: {
  groupId: string;
  session: GameSession;
  members: GroupMember[];
  viewerId: string;
}) {
  const matchId = session.currentMatchId;
  const { match, clues, role } = useMatchData(groupId, matchId, viewerId);

  const [clueText, setClueText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScores, setShowScores] = useState(false);
  const [dismissedModalMatchId, setDismissedModalMatchId] = useState<string | null>(null);

  const byId = useMemo(
    () => new Map(members.map((member) => [member.uid, member])),
    [members],
  );

  const isPlayer = session.playerIds.includes(viewerId);
  const isHost = session.hostId === viewerId;

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      await callApi("/api/game", { groupId, matchId, ...body });
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setBusy(false);
    }
  }

  if (!match) {
    return (
      <div className="rounded-2xl border-2 border-border shadow-sm bg-white/90 p-8 text-center">
        <span className="mx-auto block h-7 w-7 animate-spin rounded-full border-2 border-sky-300 border-t-indigo-300" />
        <p className="mt-3 text-sm text-sky-600">Shuffling the deck…</p>
      </div>
    );
  }

  const results = match.results;
  const showModal = match.phase === "results" && results && dismissedModalMatchId !== matchId;
  const waitingClues = session.playerIds.filter(
    (uid) => !match.cluesSubmitted.includes(uid),
  );
  const waitingRoundVote = session.playerIds.filter(
    (uid) => !match.roundVotesSubmitted.includes(uid),
  );
  const waitingVerdict = session.playerIds.filter(
    (uid) => !match.verdictVotesSubmitted.includes(uid),
  );

  const sentClue = match.cluesSubmitted.includes(viewerId);
  const votedRound = match.roundVotesSubmitted.includes(viewerId);
  const votedVerdict = match.verdictVotesSubmitted.includes(viewerId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-sky-400 hover:bg-sky-500/20 px-3 py-1 text-xs font-bold text-sky-600">
          Game {match.number}
        </span>
        <span className="rounded-full bg-cyan-400 hover:bg-cyan-500/20 px-3 py-1 text-xs font-bold text-fuchsia-200">
          Round {match.round}
        </span>
        <span className="rounded-full bg-bubble px-3 py-1 text-xs font-semibold text-sky-600">
          {session.imposterCount}{" "}
          {session.imposterCount === 1 ? "imposter" : "imposters"}
        </span>
        <button
          type="button"
          onClick={() => setShowScores((value) => !value)}
          className="ml-auto rounded-full border-2 border-amber-400 bg-amber-100 px-3 py-1 text-xs font-bold text-amber-600 transition hover:bg-amber-100"
        >
          {showScores ? "Hide points" : "🏆 Points"}
        </button>
      </div>

      {showScores ? (
        <Scoreboard session={session} members={members} viewerId={viewerId} />
      ) : null}

      {!isPlayer ? (
        <div className="rounded-2xl border-2 border-dashed border-border shadow-sm bg-bubble/80 px-5 py-4 text-center">
          <p className="text-sm font-semibold text-sky-700">
            You&apos;re watching this one 👀
          </p>
          <p className="mt-1 text-xs text-sky-600">
            You weren&apos;t dealt in, so you can read the clues but not vote.
          </p>
        </div>
      ) : (
        match.phase !== "results" && <WordCard role={role} />
      )}

      {match.phase === "clues" ? (
        <div className="space-y-3 rounded-2xl border-2 border-border shadow-sm bg-white/90 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-sky-500">
            Drop your clue
          </h2>
          <ClueFeed clues={clues} members={byId} round={match.round} />

          {isPlayer ? (
            sentClue ? (
              <p className="rounded-xl bg-emerald-100 px-4 py-3 text-center text-sm text-emerald-600">
                Clue sent ✓ — sit tight.
              </p>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const text = clueText.trim();
                  if (!text || busy) return;
                  setClueText("");
                  void send({ action: "clue", text }).catch(() => setClueText(text));
                }}
                className="flex gap-2"
              >
                <input
                  value={clueText}
                  onChange={(event) => setClueText(event.target.value)}
                  maxLength={CLUE_MAX}
                  autoFocus
                  placeholder="One word or a short hint…"
                  className="min-w-0 flex-1 rounded-xl border-2 border-border shadow-sm bg-bubble/80 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-sky-600 focus:border-sky-300"
                />
                <button
                  type="submit"
                  disabled={!clueText.trim() || busy}
                  className="rounded-xl bg-sky-400 hover:bg-sky-500 px-4 py-2.5 text-sm font-semibold transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Send
                </button>
              </form>
            )
          ) : null}

          <WaitingOn members={byId} waiting={waitingClues} />
        </div>
      ) : null}

      {match.phase === "roundVote" ? (
        <div className="space-y-3 rounded-2xl border-2 border-border shadow-sm bg-white/90 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-sky-500">
            Ready to accuse?
          </h2>
          <ClueFeed clues={clues} members={byId} round={match.round} />

          {isPlayer ? (
            votedRound ? (
              <p className="rounded-xl bg-sky-400 hover:bg-sky-500/10 px-4 py-3 text-center text-sm text-sky-600">
                Vote locked in 🔒 — revealed once everyone votes.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void send({ action: "roundVote", choice: "another" })}
                  className="rounded-xl border-2 border-border shadow-sm bg-bubble/80 px-4 py-3 text-sm font-bold transition hover:border-sky-300 disabled:opacity-40"
                >
                  🔁 One more round
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void send({ action: "roundVote", choice: "verdict" })}
                  className="rounded-xl bg-gradient-to-r from-rose-400 to-rose-500 px-4 py-3 text-sm font-bold transition hover:brightness-110 disabled:opacity-40"
                >
                  ⚖️ Go to verdict
                </button>
              </div>
            )
          ) : null}

          <WaitingOn members={byId} waiting={waitingRoundVote} />
        </div>
      ) : null}

      {match.lastTally && match.phase === "clues" && match.round > 1 ? (
        <p className="rounded-xl border-2 border-border shadow-sm bg-bubble/80 px-4 py-2.5 text-center text-xs text-sky-700">
          Round {match.lastTally.round} vote: {match.lastTally.another} wanted another
          round, {match.lastTally.verdict} wanted the verdict.
        </p>
      ) : null}

      {match.phase === "verdict" ? (
        <div className="space-y-3 rounded-2xl border-2 border-sus bg-white/90 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-rose-500">
            Who&apos;s the sus?
          </h2>
          <ClueFeed clues={clues} members={byId} round={match.round} />

          {isPlayer ? (
            votedVerdict ? (
              <p className="rounded-xl bg-rose-100 px-4 py-3 text-center text-sm text-rose-600">
                Accusation locked in 🔒
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {session.playerIds
                  .filter((uid) => uid !== viewerId)
                  .map((uid) => {
                    const member = byId.get(uid);
                    return (
                      <button
                        key={uid}
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void send({ action: "verdictVote", target: uid })
                        }
                        className="flex items-center gap-3 rounded-xl border-2 border-border shadow-sm bg-bubble/80 px-3 py-2.5 text-left transition hover:border-sus hover:bg-rose-100 disabled:opacity-40"
                      >
                        {member ? (
                          <PlayerAvatar
                            spec={member.avatar}
                            size={32}
                            className="ring-1 ring-sky-200"
                            title={member.name}
                          />
                        ) : null}
                        <span className="truncate text-sm font-semibold">
                          {member?.name ?? "Player"}
                        </span>
                      </button>
                    );
                  })}
              </div>
            )
          ) : null}

          <WaitingOn members={byId} waiting={waitingVerdict} />
        </div>
      ) : null}

      {showModal && results ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-sky-900/40 p-4 backdrop-blur-sm animate-rise">
          <div className="w-full max-w-md rounded-3xl border-4 border-sky-400 bg-white p-6 shadow-2xl">
            <h2 className="text-center text-3xl font-black tracking-tight text-sky-600">
              The reveal 🎭
            </h2>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border-2 border-sky-300 bg-sky-100 p-5 text-center shadow-inner">
                <p className="text-[11px] font-bold uppercase tracking-wider text-sky-600">
                  Crew word
                </p>
                <p className="mt-2 break-words text-2xl font-black text-sky-900">
                  {results.crewWord}
                </p>
              </div>
              <div className="rounded-2xl border-2 border-sus bg-rose-100 p-5 text-center shadow-inner">
                <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600/70">
                  Imposter word
                </p>
                <p className="mt-2 break-words text-2xl font-black text-rose-900">
                  {results.imposterWord}
                </p>
              </div>
            </div>

            <p className="mt-6 text-center text-[11px] font-bold uppercase tracking-wider text-sky-500">
              The imposters were
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {results.imposterIds.map((uid) => {
                const member = byId.get(uid);
                return (
                  <span
                    key={uid}
                    className="flex items-center gap-2 rounded-full border-2 border-sus bg-rose-100 py-1.5 pl-1.5 pr-4 shadow-sm"
                  >
                    {member ? (
                      <PlayerAvatar
                        spec={member.avatar}
                        size={32}
                        className="ring-1 ring-sky-200"
                        title={member.name}
                      />
                    ) : null}
                    <span className="text-base font-bold text-rose-600">
                      {member?.name ?? "Player"}
                    </span>
                  </span>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setDismissedModalMatchId(matchId)}
              className="mt-8 w-full rounded-2xl bg-sky-400 py-4 text-sm font-bold text-sky-900 shadow-md transition hover:-translate-y-1 hover:bg-sky-500"
            >
              See full details & points
            </button>
          </div>
        </div>
      ) : null}

      {match.phase === "results" && results ? (
        <div className="space-y-4">
          <div className="rounded-2xl border-2 border-border shadow-sm bg-white/90 p-5">
            <h2 className="text-center text-2xl font-black tracking-tight">
              The reveal 🎭
            </h2>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border-2 border-sky-300 bg-sky-100 p-4 text-center">
                <p className="text-[11px] font-bold uppercase tracking-wider text-sky-600">
                  Crew word
                </p>
                <p className="mt-1 break-words text-xl font-black">
                  {results.crewWord}
                </p>
              </div>
              <div className="rounded-xl border-2 border-sus bg-rose-100 p-4 text-center">
                <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600/70">
                  Imposter word
                </p>
                <p className="mt-1 break-words text-xl font-black">
                  {results.imposterWord}
                </p>
              </div>
            </div>

            <p className="mt-5 text-[11px] font-bold uppercase tracking-wider text-sky-500">
              The imposters were
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {results.imposterIds.map((uid) => {
                const member = byId.get(uid);
                return (
                  <span
                    key={uid}
                    className="flex items-center gap-2 rounded-full border-2 border-sus bg-rose-100 py-1 pl-1 pr-3"
                  >
                    {member ? (
                      <PlayerAvatar
                        spec={member.avatar}
                        size={26}
                        className="ring-1 ring-sky-200"
                        title={member.name}
                      />
                    ) : null}
                    <span className="text-sm font-bold text-rose-600">
                      {member?.name ?? "Player"}
                    </span>
                  </span>
                );
              })}
            </div>

            <p className="mt-5 text-[11px] font-bold uppercase tracking-wider text-sky-500">
              Who accused who
            </p>
            <ul className="mt-2 space-y-1">
              {session.playerIds.map((uid) => {
                const voter = byId.get(uid);
                const target = byId.get(results.votes[uid] ?? "");
                const correct = results.imposterIds.includes(results.votes[uid] ?? "");
                return (
                  <li
                    key={uid}
                    className="flex items-center gap-2 rounded-lg bg-bubble/80 px-3 py-1.5 text-sm"
                  >
                    <span className="truncate font-semibold">
                      {voter?.name ?? "Player"}
                    </span>
                    <span className="text-sky-600">accused</span>
                    <span className="truncate font-semibold">
                      {target?.name ?? "nobody"}
                    </span>
                    <span className="ml-auto">{correct ? "🎯" : "❌"}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <Scoreboard
            session={session}
            members={members}
            viewerId={viewerId}
            justEarned={results.points}
          />

          {isHost ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void send({ action: "next", sessionId: session.id, matchId: null })
                }
                className="rounded-xl bg-gradient-to-r from-sky-400 to-cyan-400 px-5 py-3 text-sm font-bold transition hover:brightness-110 disabled:opacity-40"
              >
                🔁 Play another game
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (window.confirm("End the whole set and show the final points?")) {
                    void send({ action: "end", sessionId: session.id, matchId: null });
                  }
                }}
                className="rounded-xl border-2 border-border shadow-sm bg-bubble/80 px-5 py-3 text-sm font-bold text-sky-700 transition hover:border-sus hover:text-rose-600 disabled:opacity-40"
              >
                🏁 Finish for good
              </button>
            </div>
          ) : (
            <p className="rounded-xl border-2 border-dashed border-border shadow-sm bg-bubble/80 px-4 py-3 text-center text-sm text-sky-600">
              Waiting for the host to deal the next game…
            </p>
          )}
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl border-2 border-sus bg-rose-100 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

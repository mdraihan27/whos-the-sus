"use client";

import { PlayerAvatar } from "@/components/player-avatar";
import type { GameSession, GroupMember } from "@/lib/game-types";

const MEDALS = ["🥇", "🥈", "🥉"];

export function Scoreboard({
  session,
  members,
  viewerId,
  justEarned,
}: {
  session: GameSession;
  members: GroupMember[];
  viewerId: string;
  /** Points won in the match that just finished, shown as a +1 flash. */
  justEarned?: Record<string, number>;
}) {
  const byId = new Map(members.map((member) => [member.uid, member]));

  const sorted = session.playerIds
    .map((uid) => ({
      uid,
      member: byId.get(uid),
      score: session.scores[uid] ?? 0,
      gained: justEarned?.[uid] ?? 0,
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.member?.name ?? "").localeCompare(b.member?.name ?? ""),
    );

  // Players on equal points share a rank, so two leaders both read as 1st.
  const rows = sorted.map((row, index) => ({
    ...row,
    rank:
      index > 0 && sorted[index - 1].score === row.score
        ? -1
        : index + 1,
  }));

  // Fill the shared ranks in, now that the breaks are known.
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].rank === -1) rows[i].rank = rows[i - 1].rank;
  }

  return (
    <div className="rounded-2xl border-2 border-border shadow-sm bg-white/90 p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-amber-500">
          Points
        </h2>
        <span className="text-xs text-sky-600">
          {session.matchNumber} {session.matchNumber === 1 ? "game" : "games"} played
        </span>
      </div>

      <ul className="mt-4 space-y-1.5">
        {rows.map((row) => {
          const medal = MEDALS[row.rank - 1];

          return (
            <li
              key={row.uid}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                row.uid === viewerId ? "bg-sky-400 hover:bg-sky-500/15" : "bg-bubble/80"
              }`}
            >
              <span className="w-6 shrink-0 text-center text-sm">
                {medal ?? <span className="text-sky-600">{row.rank}</span>}
              </span>

              {row.member ? (
                <PlayerAvatar
                  spec={row.member.avatar}
                  size={30}
                  className="ring-1 ring-sky-200"
                  title={row.member.name}
                />
              ) : (
                <span className="h-[30px] w-[30px] shrink-0 rounded-full bg-bubble" />
              )}

              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                {row.member?.name ?? "Player"}
                {row.uid === viewerId ? (
                  <span className="ml-1.5 text-[10px] text-sky-500">YOU</span>
                ) : null}
              </span>

              {row.gained > 0 ? (
                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                  +{row.gained}
                </span>
              ) : null}

              <span className="w-8 shrink-0 text-right text-lg font-black tabular-nums">
                {row.score}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

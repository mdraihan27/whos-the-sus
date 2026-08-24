"use client";

import { useMemo, useState } from "react";

import { ActiveDot } from "@/components/member-panel";
import { PlayerAvatar } from "@/components/player-avatar";
import { callApi, messageFrom } from "@/lib/api";
import { isActive, type GroupMember } from "@/lib/game-types";
import { useNow } from "@/lib/hooks";

const MIN_PLAYERS = 3;

export function GameSetup({
  groupId,
  members,
  viewerId,
  onClose,
}: {
  groupId: string;
  members: GroupMember[];
  viewerId: string;
  onClose: () => void;
}) {
  const now = useNow(5_000);

  // Only players who are actually at their screens can be dealt in.
  const available = useMemo(
    () => members.filter((member) => isActive(member.lastSeen, now)),
    [members, now],
  );

  const [selected, setSelected] = useState<string[]>(() => [viewerId]);
  const [imposters, setImposters] = useState("1");
  const [reveal, setReveal] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Someone may go idle after being ticked, so validate against the live list.
  const activeIds = new Set(available.map((member) => member.uid));
  const players = selected.filter((uid) => activeIds.has(uid));
  const imposterCount = Number(imposters);
  const maxImposters = Math.max(1, players.length - 1);

  const problem =
    players.length < MIN_PLAYERS
      ? `Pick at least ${MIN_PLAYERS} active players.`
      : !Number.isInteger(imposterCount) || imposterCount < 1
        ? "Enter how many imposters."
        : imposterCount > maxImposters
          ? "That's too many imposters for this crew."
          : null;

  function toggle(uid: string) {
    setSelected((current) =>
      current.includes(uid)
        ? current.filter((entry) => entry !== uid)
        : [...current, uid],
    );
  }

  async function handleStart(event: React.FormEvent) {
    event.preventDefault();
    if (problem || busy) return;

    setBusy(true);
    setError(null);
    try {
      await callApi("/api/game", {
        action: "start",
        groupId,
        playerIds: players,
        imposterCount,
        revealImposters: reveal,
      });
      // The session listener swings everyone over to the game view.
    } catch (err) {
      setError(messageFrom(err));
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleStart}
      className="rounded-2xl border-2 border-border shadow-sm bg-white/90 p-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black tracking-tight">Set up the game</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-sky-600 transition hover:text-sky-900"
        >
          Cancel
        </button>
      </div>

      <p className="mt-1 text-xs text-sky-700">
        Only players who are active right now can be dealt in.
      </p>

      <div className="mt-4 space-y-1.5">
        {available.length === 0 ? (
          <p className="rounded-xl border-2 border-dashed border-border shadow-sm bg-bubble/80 px-4 py-6 text-center text-sm text-sky-600">
            Nobody is active. Ask the crew to open the group.
          </p>
        ) : (
          available.map((member) => {
            const picked = players.includes(member.uid);
            return (
              <button
                key={member.uid}
                type="button"
                onClick={() => toggle(member.uid)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                  picked
                    ? "border-sky-300 bg-sky-400 hover:bg-sky-500/15"
                    : "border-border border-2 shadow-sm bg-bubble/80 hover:border-sky-300"
                }`}
              >
                <PlayerAvatar
                  spec={member.avatar}
                  size={32}
                  className="ring-1 ring-sky-200"
                  title={member.name}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {member.name}
                  {member.uid === viewerId ? (
                    <span className="ml-1.5 text-[10px] text-sky-500">YOU</span>
                  ) : null}
                </span>
                <ActiveDot active />
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border text-xs ${
                    picked
                      ? "border-sky-400 bg-sky-400 hover:bg-sky-500 text-sky-900"
                      : "border-border border-2 shadow-sm text-transparent"
                  }`}
                >
                  ✓
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="imposter-count"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-sky-600"
          >
            How many imposters?
          </label>
          <input
            id="imposter-count"
            type="number"
            min={1}
            inputMode="numeric"
            value={imposters}
            onChange={(event) => setImposters(event.target.value)}
            className="w-full rounded-xl border-2 border-border shadow-sm bg-bubble/80 px-3.5 py-2.5 text-sm outline-none transition focus:border-sky-300"
          />
        </div>

        <div className="flex items-end">
          <button
            type="button"
            role="switch"
            aria-checked={reveal}
            onClick={() => setReveal((value) => !value)}
            className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition ${
              reveal
                ? "border-emerald-400/60 bg-emerald-100"
                : "border-border border-2 shadow-sm bg-bubble/80"
            }`}
          >
            <span
              className={`relative h-5 w-9 shrink-0 rounded-full transition ${
                reveal ? "bg-emerald-500" : "bg-slate-600"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                  reveal ? "left-[1.15rem]" : "left-0.5"
                }`}
              />
            </span>
            <span className="text-xs font-semibold leading-tight">
              Tell imposters
              <span className="block font-normal text-sky-700">
                they know they&apos;re sus
              </span>
            </span>
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={Boolean(problem) || busy}
        className="mt-5 w-full rounded-xl bg-gradient-to-r from-sky-400 to-cyan-400 px-5 py-3 text-sm font-bold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Dealing…" : `Start game · ${players.length} players`}
      </button>

      {problem && players.length > 0 ? (
        <p className="mt-2 text-center text-xs text-sky-600">{problem}</p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-xl border-2 border-sus bg-rose-100 px-4 py-2.5 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
    </form>
  );
}

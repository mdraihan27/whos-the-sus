"use client";

import { useState } from "react";

import { PlayerAvatar } from "@/components/player-avatar";
import { callApi, messageFrom } from "@/lib/api";
import { isActive, type GroupMember, type GroupSummary } from "@/lib/game-types";
import { useCopy, useNow } from "@/lib/hooks";

export function ActiveDot({ active }: { active: boolean }) {
  return (
    <span
      title={active ? "Active now" : "Away"}
      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
        active ? "bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400/70" : "bg-slate-600"
      }`}
    />
  );
}

export function MemberPanel({
  group,
  members,
  viewerId,
}: {
  group: GroupSummary;
  members: GroupMember[];
  viewerId: string;
}) {
  const now = useNow();

  const [copiedCode, copyCode] = useCopy();
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOwner = group.ownerId === viewerId;

  async function handleRemove(uid: string, name: string) {
    const leaving = uid === viewerId;
    const ok = window.confirm(
      leaving ? `Leave ${group.name}?` : `Remove ${name} from ${group.name}?`,
    );
    if (!ok) return;

    setRemoving(uid);
    setError(null);
    try {
      await callApi("/api/groups", { action: "remove", groupId: group.id, uid });
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="rounded-2xl border-2 border-border shadow-sm bg-white/90 p-5">
      <h2 className="text-sm font-bold uppercase tracking-wider text-sky-500">
        Crew · {members.length}
      </h2>

      <div className="mt-4 rounded-xl border-2 border-border shadow-sm bg-bubble/80 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-600">
          Invite code
        </p>
        <p className="mt-1 font-mono text-2xl font-bold tracking-[0.28em] text-sky-900">
          {group.inviteCode}
        </p>
        <div className="mt-3">
          <button
            type="button"
            onClick={() => copyCode(group.inviteCode)}
            className="w-full rounded-lg bg-sky-400 hover:bg-sky-500 px-3 py-2 text-xs font-semibold text-sky-900 transition"
          >
            {copiedCode ? "Code copied ✓" : "Copy invite code"}
          </button>
        </div>
      </div>

      <ul className="mt-4 space-y-1.5">
        {members.map((member) => {
          const active = isActive(member.lastSeen, now);
          const canRemove = isOwner
            ? member.uid !== viewerId
            : member.uid === viewerId;

          return (
            <li
              key={member.uid}
              className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-bubble/80"
            >
              <PlayerAvatar
                spec={member.avatar}
                size={32}
                className="ring-1 ring-sky-200"
                title={member.name}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold">
                    {member.name}
                  </span>
                  {member.uid === viewerId ? (
                    <span className="text-[10px] font-bold text-sky-500">
                      YOU
                    </span>
                  ) : null}
                  {member.isOwner ? <span title="Group owner">👑</span> : null}
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-sky-600">
                  <ActiveDot active={active} />
                  {active ? "active now" : "away"}
                </span>
              </span>

              {canRemove ? (
                <button
                  type="button"
                  onClick={() => handleRemove(member.uid, member.name)}
                  disabled={removing === member.uid}
                  className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-sky-600 transition hover:bg-rose-100 hover:text-rose-600 disabled:opacity-40"
                >
                  {member.uid === viewerId ? "Leave" : "Remove"}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>

      {error ? (
        <p className="mt-3 rounded-lg border-2 border-sus bg-rose-100 px-3 py-2 text-xs text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { GameRoom } from "@/components/game/game-room";
import { GameSetup } from "@/components/game/game-setup";
import { Scoreboard } from "@/components/game/scoreboard";
import { GroupChat } from "@/components/group-chat";
import { MemberPanel } from "@/components/member-panel";
import { PlayerBar } from "@/components/player-bar";
import { Starfield } from "@/components/starfield";
import { subscribeToLatestSession } from "@/lib/game";
import type {
  ChatMessage,
  GameSession,
  GroupMember,
  GroupSummary,
} from "@/lib/game-types";
import {
  subscribeToGroup,
  subscribeToMembers,
  subscribeToMessages,
} from "@/lib/groups";
import { usePresence } from "@/lib/hooks";

type Tab = "game" | "chat";

export function GroupRoom({ groupId }: { groupId: string }) {
  const { user, profile } = useAuth();
  const uid = user?.uid ?? "";

  const [group, setGroup] = useState<GroupSummary | null | "missing">(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [session, setSession] = useState<GameSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("game");
  const [setupOpen, setSetupOpen] = useState(false);
  const [finalDismissed, setFinalDismissed] = useState(false);

  const initialMessagesLoaded = useRef(false);
  const [lastReadCount, setLastReadCount] = useState(0);

  useEffect(() => {
    if (messages && !initialMessagesLoaded.current) {
      initialMessagesLoaded.current = true;
      setLastReadCount(messages.length);
    } else if (tab === "chat" && messages) {
      setLastReadCount(messages.length);
    }
  }, [tab, messages]);

  const unreadCount = messages ? Math.max(0, messages.length - lastReadCount) : 0;

  usePresence(groupId, uid || null);

  useEffect(() => {
    return subscribeToGroup(
      groupId,
      (next) => setGroup(next ?? "missing"),
      () => setGroup("missing"),
    );
  }, [groupId]);

  const ownerId = group && group !== "missing" ? group.ownerId : "";

  useEffect(() => {
    if (!ownerId) return;
    return subscribeToMembers(
      groupId,
      ownerId,
      (next) => setMembers(next),
      () => setError("Couldn't load the crew list."),
    );
  }, [groupId, ownerId]);

  useEffect(() => {
    return subscribeToMessages(
      groupId,
      (next) => setMessages(next),
      () => setError("Couldn't load the chat."),
    );
  }, [groupId]);

  useEffect(() => {
    return subscribeToLatestSession(
      groupId,
      (next) => setSession(next),
      () => setError("Couldn't load the game."),
    );
  }, [groupId]);

  if (group === "missing") {
    return (
      <div className="relative flex flex-1 flex-col">
        <Starfield />
        <div className="relative flex flex-1 flex-col">
          <PlayerBar back={{ href: "/", label: "Groups" }} />
          <main className="grid flex-1 place-items-center px-4">
            <div className="max-w-sm rounded-2xl border-2 border-border shadow-sm bg-white/90 p-8 text-center">
              <p className="text-lg font-bold">Group not found</p>
              <p className="mt-2 text-sm text-sky-700">
                It may have been deleted, or you were removed from it.
              </p>
              <Link
                href="/"
                className="mt-5 inline-block rounded-xl bg-sky-400 hover:bg-sky-500 px-5 py-2.5 text-sm font-semibold"
              >
                Back to groups
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!group || !profile) {
    return (
      <div className="grid flex-1 place-items-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-sky-300 border-t-indigo-300" />
      </div>
    );
  }

  const playing = session?.status === "active";
  const showFinal = session?.status === "ended" && !finalDismissed;

  return (
    <div className="relative flex min-h-full flex-1 flex-col">
      <Starfield />
      <div className="relative flex min-h-0 flex-1 flex-col">
        <PlayerBar back={{ href: "/", label: "Groups" }} />

        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row">
          <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
            <div className="flex items-center gap-3">
              <h1 className="truncate text-2xl font-black tracking-tight">
                {group.name}
              </h1>
              {playing ? (
                <span className="shrink-0 animate-pulse rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
                  ● LIVE
                </span>
              ) : null}
            </div>

            {playing ? (
              <div className="flex gap-1 rounded-xl border-2 border-border shadow-sm bg-white/90 p-1">
                {(["game", "chat"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTab(value)}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      tab === value
                        ? "bg-sky-400 hover:bg-sky-500 text-sky-900"
                        : "text-sky-600 hover:text-sky-900"
                    }`}
                  >
                    {value === "game" ? (
                      "🎮 Game"
                    ) : (
                      <span className="flex items-center justify-center gap-1.5">
                        💬 Group chat
                        {tab !== "chat" && unreadCount > 0 ? (
                          <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                            {unreadCount}
                          </span>
                        ) : null}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : null}

            {showFinal && session ? (
              <div className="space-y-3 rounded-2xl border-2 border-amber-400 bg-amber-100 p-5">
                <h2 className="text-center text-xl font-black tracking-tight text-amber-600">
                  🏁 Final points
                </h2>
                <Scoreboard session={session} members={members} viewerId={uid} />
                <button
                  type="button"
                  onClick={() => setFinalDismissed(true)}
                  className="w-full rounded-xl border-2 border-border shadow-sm bg-bubble/80 px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:text-sky-900"
                >
                  Close
                </button>
              </div>
            ) : null}

            {playing && session && tab === "game" ? (
              <GameRoom
                groupId={groupId}
                session={session}
                members={members}
                viewerId={uid}
              />
            ) : null}

            {!playing || tab === "chat" ? (
              <GroupChat
                groupId={groupId}
                profile={profile}
                messages={messages}
              />
            ) : null}
          </section>

          <aside className="w-full shrink-0 space-y-4 lg:w-80">
            {!playing ? (
              setupOpen ? (
                <GameSetup
                  groupId={groupId}
                  members={members}
                  viewerId={uid}
                  onClose={() => setSetupOpen(false)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setSetupOpen(true)}
                  className="w-full rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-400 px-5 py-4 text-base font-black transition hover:brightness-110"
                >
                  🎮 Start a game
                </button>
              )
            ) : null}

            {session && !showFinal ? (
              <details className="rounded-2xl border-2 border-border shadow-sm bg-white/90 p-4">
                <summary className="cursor-pointer text-sm font-bold uppercase tracking-wider text-amber-500">
                  🏆 Point table
                </summary>
                <div className="mt-3">
                  <Scoreboard session={session} members={members} viewerId={uid} />
                </div>
              </details>
            ) : null}

            <MemberPanel group={group} members={members} viewerId={uid} />
          </aside>
        </main>

        {error ? (
          <p className="mx-auto mb-4 w-full max-w-5xl rounded-xl border-2 border-sus bg-rose-100 px-4 py-3 text-sm text-rose-600">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

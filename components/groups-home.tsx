"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { PlayerBar } from "@/components/player-bar";
import { Starfield } from "@/components/starfield";
import { callApi, messageFrom } from "@/lib/api";
import { GROUP_NAME_MAX, type GroupSummary } from "@/lib/game-types";
import { subscribeToMyGroups } from "@/lib/groups";

const GRADIENTS = [
  "from-sky-400 to-cyan-400 text-sky-900",
  "from-rose-400 to-fuchsia-400 text-rose-900",
  "from-amber-400 to-orange-400 text-amber-900",
  "from-emerald-400 to-teal-400 text-emerald-900",
  "from-indigo-400 to-violet-400 text-indigo-900",
  "from-pink-400 to-rose-400 text-pink-900",
];

function GroupCard({ group, uid }: { group: GroupSummary; uid: string }) {
  const colorClass = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < group.id.length; i++) {
      hash = group.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
  }, [group.id]);
  return (
    <Link
      href={`/g/${group.id}`}
      className="group flex items-center gap-4 rounded-3xl border-2 border-rose-100 shadow-sm bg-white/90 p-4 transition hover:border-rose-300 hover:bg-white hover:shadow-md"
    >
      <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${colorClass} text-xl font-black shadow-inner`}>
        {group.name.slice(0, 1).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">{group.name}</span>
        <span className="block text-xs text-sky-600">
          {group.memberIds.length}{" "}
          {group.memberIds.length === 1 ? "member" : "members"}
          {group.ownerId === uid ? " · you own this" : ""}
        </span>
      </span>
      <span className="text-sky-500 transition group-hover:translate-x-0.5 group-hover:text-sky-600">
        &rarr;
      </span>
    </Link>
  );
}

export function GroupsHome() {
  const { user, profile } = useAuth();
  const router = useRouter();

  const [groups, setGroups] = useState<GroupSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    return subscribeToMyGroups(
      user.uid,
      (next) => setGroups(next),
      () => setLoadError("Uh oh, we couldn't find your crews! Check your connection or refresh the page."),
    );
  }, [user]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || busy) return;

    setBusy("create");
    setFormError(null);
    try {
      const { groupId } = await callApi<{ groupId: string }>("/api/groups", {
        action: "create",
        name,
      });
      setName("");
      router.push(`/g/${groupId}`);
    } catch (error) {
      setFormError(messageFrom(error));
      setBusy(null);
    }
  }

  async function handleJoin(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim() || busy) return;

    setBusy("join");
    setFormError(null);
    try {
      const { groupId } = await callApi<{ groupId: string }>("/api/groups", {
        action: "join",
        code,
      });
      setCode("");
      router.push(`/g/${groupId}`);
    } catch (error) {
      setFormError(messageFrom(error));
      setBusy(null);
    }
  }

  return (
    <div className="relative flex min-h-full flex-1 flex-col">
      <Starfield />
      <div className="relative flex flex-1 flex-col">
        <PlayerBar />

        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
          <h1 className="text-3xl font-black tracking-tight">
            Hey {profile?.name} 👋
          </h1>
          <p className="mt-1 text-sm text-sky-700">
            Start a crew, or hop into one with an invite code.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <form
              onSubmit={handleCreate}
              className="rounded-3xl border-2 border-rose-200 shadow-md bg-white/90 p-6"
            >
              <h2 className="text-sm font-bold uppercase tracking-wider text-rose-500">
                New group
              </h2>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={GROUP_NAME_MAX}
                placeholder="Friday Night Crew"
                className="mt-3 w-full rounded-2xl border-2 border-rose-100 shadow-inner bg-rose-50/50 px-4 py-3 text-sm outline-none transition placeholder:text-rose-400 focus:border-rose-400 focus:bg-white"
              />
              <button
                type="submit"
                disabled={busy !== null || name.trim().length < 2}
                className="mt-4 w-full rounded-2xl bg-gradient-to-r from-rose-400 to-pink-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:from-rose-500 hover:to-pink-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy === "create" ? "Creating…" : "Create group"}
              </button>
            </form>

            <form
              onSubmit={handleJoin}
              className="rounded-3xl border-2 border-orange-200 shadow-md bg-white/90 p-6"
            >
              <h2 className="text-sm font-bold uppercase tracking-wider text-orange-500">
                Join a group
              </h2>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                maxLength={6}
                placeholder="ABC123"
                className="mt-3 w-full rounded-2xl border-2 border-orange-100 shadow-inner bg-orange-50/50 px-4 py-3 font-mono text-sm tracking-[0.3em] outline-none transition placeholder:tracking-normal placeholder:text-orange-400 focus:border-orange-400 focus:bg-white"
              />
              <button
                type="submit"
                disabled={busy !== null || code.trim().length < 4}
                className="mt-4 w-full rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:from-amber-500 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy === "join" ? "Joining…" : "Join"}
              </button>
            </form>
          </div>

          {formError ? (
            <p className="mt-4 rounded-xl border-2 border-sus bg-rose-100 px-4 py-3 text-sm text-rose-600">
              {formError}
            </p>
          ) : null}

          <h2 className="mt-9 text-sm font-bold uppercase tracking-wider text-sky-500">
            Your groups
          </h2>

          <div className="mt-3 space-y-2.5">
            {loadError ? (
              <p className="rounded-xl border-2 border-sus bg-rose-100 px-4 py-3 text-sm text-rose-600">
                {loadError}
              </p>
            ) : groups === null ? (
              <p className="text-sm text-sky-600">Loading…</p>
            ) : groups.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-rose-200 shadow-sm bg-rose-50/50 px-5 py-10 text-center">
                <p className="text-sm text-rose-700">
                  No groups yet. Create one and share the code with your friends.
                </p>
              </div>
            ) : (
              groups.map((group) => (
                <GroupCard key={group.id} group={group} uid={user?.uid ?? ""} />
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { PlayerAvatar } from "@/components/player-avatar";
import { randomAvatar } from "@/lib/avatar";
import {
  NAME_MAX_LENGTH,
  createProfile,
  validateName,
} from "@/lib/profile";

/** Google gives us a full name; the first word makes a friendlier default. */
function suggestName(displayName: string | null): string {
  const first = (displayName ?? "").trim().split(/\s+/)[0] ?? "";
  return validateName(first) === null ? first : "";
}

export function NameSetupScreen() {
  const { user, signOut } = useAuth();

  const [name, setName] = useState(() => suggestName(user?.displayName ?? null));
  const [avatar, setAvatar] = useState(randomAvatar);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const nameError = useMemo(() => validateName(name), [name]);
  const showError = touched && nameError;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);

    if (!user || nameError) return;

    setSaving(true);
    setSaveError(null);

    try {
      await createProfile({
        uid: user.uid,
        name,
        email: user.email,
        photoURL: user.photoURL,
        avatar,
      });
      // The profile listener flips us over to the lobby once the write lands.
    } catch {
      setSaveError("Couldn't save your badge. Try again in a moment.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md animate-rise">
      <div className="rounded-3xl border-2 border-border shadow-sm/70 bg-white/90 p-8 shadow-2xl shadow-black/50 backdrop-blur">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-sky-500">
          New crewmate
        </p>
        <h1 className="mt-3 text-center text-3xl font-black tracking-tight">
          Pick your name
        </h1>

        <div className="mt-7 flex flex-col items-center">
          <div className="animate-float">
            <PlayerAvatar
              spec={avatar}
              size={132}
              className="ring-4 ring-sky-200"
              title="Your avatar"
            />
          </div>
          <button
            type="button"
            onClick={() => setAvatar(randomAvatar())}
            className="mt-4 rounded-full border-2 border-border shadow-sm bg-bubble/80 px-4 py-2 text-xs font-semibold text-sky-700 transition hover:border-sky-300 hover:text-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            Shuffle look
          </button>
        </div>

        <div className="mt-7">
          <label
            htmlFor="player-name"
            className="mb-2 block text-xs font-semibold uppercase tracking-wider text-sky-600"
          >
            Display name
          </label>
          <input
            id="player-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => setTouched(true)}
            maxLength={NAME_MAX_LENGTH}
            autoComplete="nickname"
            autoFocus
            placeholder="Red, Captain, Sus McSusface…"
            aria-invalid={showError ? true : undefined}
            aria-describedby={showError ? "player-name-error" : undefined}
            className={`w-full rounded-2xl border bg-bubble/80 px-4 py-3.5 text-base outline-none transition placeholder:text-sky-600 focus:border-sky-300 focus:ring-2 focus:ring-indigo-500/25 ${
              showError ? "border-sus border-2" : "border-border border-2 shadow-sm"
            }`}
          />
          <div className="mt-2 flex items-start justify-between gap-3 text-xs">
            <span id="player-name-error" className="text-rose-300">
              {showError ? nameError : ""}
            </span>
            <span className="shrink-0 tabular-nums text-sky-600">
              {name.trim().length}/{NAME_MAX_LENGTH}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || Boolean(nameError)}
          className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl bg-sky-400 hover:bg-sky-500 px-5 py-3.5 text-sm font-semibold text-sky-900 transition hover:bg-sky-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {saving ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-transparent" />
              Saving&hellip;
            </>
          ) : (
            "Join the crew"
          )}
        </button>

        {saveError ? (
          <p className="mt-4 rounded-xl border-2 border-sus bg-rose-100 px-4 py-3 text-sm text-rose-600">
            {saveError}
          </p>
        ) : null}

        <button
          type="button"
          onClick={signOut}
          className="mt-5 w-full text-center text-xs text-sky-600 transition hover:text-sky-700"
        >
          Not {user?.email ?? "you"}? Sign out
        </button>
      </div>
    </form>
  );
}

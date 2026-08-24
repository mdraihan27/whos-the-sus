"use client";

import { PlayerAvatar } from "@/components/player-avatar";
import { useAuth } from "@/components/auth-provider";
import type { AvatarSpec } from "@/lib/avatar";

const TEASER_CREW: AvatarSpec[] = [
  { color: "tomato", backdrop: "dawn", eyes: "sus", accessory: "none" },
  { color: "ocean", backdrop: "deep", eyes: "happy", accessory: "antenna" },
  { color: "lime", backdrop: "electric", eyes: "dot", accessory: "sprout" },
  { color: "bubblegum", backdrop: "nebula", eyes: "star", accessory: "crown" },
];

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7A21.99 21.99 0 0 0 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18A13.2 13.2 0 0 1 11 24c0-1.45.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

export function SignInScreen() {
  const { signIn, signingIn, error, dismissError } = useAuth();

  return (
    <div className="w-full max-w-md animate-rise">
      <div className="mb-8 flex justify-center gap-3">
        {TEASER_CREW.map((spec, i) => (
          <div
            key={spec.color}
            className="animate-float"
            style={{ animationDelay: `${i * 0.35}s` }}
          >
            <PlayerAvatar
              spec={spec}
              size={56}
              className="ring-2 ring-sky-200"
              title="Crewmate"
            />
          </div>
        ))}
      </div>

      <div className="rounded-3xl border-2 border-border shadow-sm/70 bg-white/90 p-8 shadow-2xl shadow-black/50 backdrop-blur">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-sky-500">
          Crew manifest
        </p>
        <h1 className="mt-3 text-center text-4xl font-black tracking-tight">
          Who&apos;s the <span className="text-sus">Sus</span>?
        </h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-sky-700">
          Sign in with Google to claim your crew badge. We&apos;ll keep you
          signed in on this device.
        </p>

        <button
          type="button"
          onClick={signIn}
          disabled={signingIn}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-3.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {signingIn ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
              Opening Google&hellip;
            </>
          ) : (
            <>
              <GoogleMark />
              Continue with Google
            </>
          )}
        </button>

        {error ? (
          <div className="mt-5 flex items-start gap-3 rounded-xl border-2 border-sus bg-rose-100 px-4 py-3 text-sm text-rose-600">
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={dismissError}
              className="text-rose-500 transition hover:text-rose-100"
              aria-label="Dismiss error"
            >
              &times;
            </button>
          </div>
        ) : null}
      </div>

      <p className="mt-6 text-center text-xs text-sky-600">
        We only read your Google name and email to set up your crew badge.
      </p>
    </div>
  );
}

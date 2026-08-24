"use client";

import { useAuth } from "@/components/auth-provider";
import { FirebaseSetupNotice } from "@/components/firebase-setup-notice";
import { NameSetupScreen } from "@/components/name-setup-screen";
import { SignInScreen } from "@/components/sign-in-screen";
import { Starfield } from "@/components/starfield";
import { isFirebaseConfigured } from "@/lib/firebase";

function BootSplash() {
  return (
    <div className="flex flex-col items-center gap-4 text-sky-600">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-sky-300 border-t-indigo-300" />
      <p className="text-sm">Checking your crew badge&hellip;</p>
    </div>
  );
}

function ProfileErrorScreen() {
  const { error, signOut } = useAuth();

  return (
    <div className="w-full max-w-md rounded-3xl border-2 border-sus bg-white/90 p-8 shadow-2xl shadow-black/50 backdrop-blur">
      <h1 className="text-2xl font-black tracking-tight text-rose-600">
        Can&apos;t load your badge
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-sky-700">{error}</p>
      <button
        type="button"
        onClick={signOut}
        className="mt-6 w-full rounded-2xl border-2 border-border shadow-sm bg-bubble/80 px-5 py-3 text-sm font-semibold text-sky-700 transition hover:text-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
      >
        Sign out
      </button>
    </div>
  );
}

/** Gate screens centre themselves; pages get the full frame to lay out in. */
function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-16">
      <Starfield />
      <div className="relative flex w-full justify-center">{children}</div>
    </div>
  );
}

/** Renders `children` only once the player is signed in with a finished badge. */
export function AppGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();

  if (!isFirebaseConfigured) {
    return (
      <Centered>
        <FirebaseSetupNotice />
      </Centered>
    );
  }

  switch (status) {
    case "loading":
      return (
        <Centered>
          <BootSplash />
        </Centered>
      );
    case "signed-out":
      return (
        <Centered>
          <SignInScreen />
        </Centered>
      );
    case "needs-profile":
      return (
        <Centered>
          <NameSetupScreen />
        </Centered>
      );
    case "profile-error":
      return (
        <Centered>
          <ProfileErrorScreen />
        </Centered>
      );
    case "ready":
      return <>{children}</>;
  }
}

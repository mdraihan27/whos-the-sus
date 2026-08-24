"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";

import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { subscribeToProfile, type PlayerProfile } from "@/lib/profile";

type AuthStatus =
  | "loading"
  | "signed-out"
  | "needs-profile"
  | "profile-error"
  | "ready";

/** Snapshot of one user's profile. Tagged with `uid` so a stale result from a
 *  previous account reads as "still loading" rather than as that user's data. */
type ProfileState = {
  uid: string;
  profile: PlayerProfile | null;
  error: string | null;
};

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  profile: PlayerProfile | null;
  error: string | null;
  signingIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  dismissError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Popup is nicer on desktop; these cases mean we should hand off to a redirect. */
const REDIRECT_FALLBACK_CODES = new Set([
  "auth/popup-blocked",
  "auth/operation-not-supported-in-this-environment",
  "auth/web-storage-unsupported",
]);

/** The player closed or double-triggered the popup — not worth an error banner. */
const SILENT_CODES = new Set([
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/user-cancelled",
]);

function messageFor(code: string | undefined): string {
  switch (code) {
    case "auth/network-request-failed":
      return "Network hiccup. Check your connection and try again.";
    case "auth/unauthorized-domain":
      return "This domain isn't allowed in Firebase Auth settings yet.";
    case "auth/account-exists-with-different-credential":
      return "That email is already linked to another sign-in method.";
    default:
      return "Sign-in failed. Give it another go.";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // `undefined` means Firebase hasn't restored the persisted session yet.
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [profileState, setProfileState] = useState<ProfileState | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Watch the persisted session. Firebase restores it from IndexedDB on every
  // visit, so a signed-in player never sees the sign-in screen again.
  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const auth = getFirebaseAuth();

    // Completes the sign-in when the popup path wasn't available.
    getRedirectResult(auth).catch((err: { code?: string }) => {
      if (!SILENT_CODES.has(err?.code ?? "")) setError(messageFor(err?.code));
    });

    return onAuthStateChanged(
      auth,
      (nextUser) => {
        setUser(nextUser);
        setSigningIn(false);
      },
      () => {
        setUser(null);
        setError("Couldn't reach Firebase Auth.");
      },
    );
  }, []);

  // Mirror the player's Firestore profile for as long as they're signed in.
  useEffect(() => {
    if (!user) return;

    const { uid } = user;

    return subscribeToProfile(
      uid,
      (profile) => setProfileState({ uid, profile, error: null }),
      () =>
        setProfileState({
          uid,
          profile: null,
          error:
            "Couldn't read your profile. Check that Firestore is enabled and firestore.rules is deployed.",
        }),
    );
  }, [user]);

  const signIn = useCallback(async () => {
    setError(null);
    setSigningIn(true);

    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      const code = (err as { code?: string }).code;

      if (REDIRECT_FALLBACK_CODES.has(code ?? "")) {
        await signInWithRedirect(auth, provider);
        return;
      }

      setSigningIn(false);
      if (!SILENT_CODES.has(code ?? "")) setError(messageFor(code));
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    setProfileState(null);
    await firebaseSignOut(getFirebaseAuth());
  }, []);

  // A profile snapshot only counts once it belongs to the current user.
  const currentProfileState =
    user && profileState?.uid === user.uid ? profileState : null;

  const status: AuthStatus = useMemo(() => {
    if (user === undefined) return "loading";
    if (user === null) return "signed-out";
    if (!currentProfileState) return "loading";
    if (currentProfileState.error) return "profile-error";
    return currentProfileState.profile ? "ready" : "needs-profile";
  }, [currentProfileState, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user: user ?? null,
      profile: currentProfileState?.profile ?? null,
      error: error ?? currentProfileState?.error ?? null,
      signingIn,
      signIn,
      signOut,
      dismissError: () => setError(null),
    }),
    [currentProfileState, error, signIn, signOut, signingIn, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

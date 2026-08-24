import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";

import { normalizeAvatar, type AvatarSpec } from "@/lib/avatar";
import { getDb } from "@/lib/firebase";

export type PlayerProfile = {
  uid: string;
  name: string;
  email: string | null;
  photoURL: string | null;
  avatar: AvatarSpec;
};

export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 18;

const NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} _.'-]*$/u;

/** Returns an error message, or `null` when the name is usable. */
export function validateName(raw: string): string | null {
  const name = raw.trim();

  if (name.length < NAME_MIN_LENGTH) {
    return `Use at least ${NAME_MIN_LENGTH} characters.`;
  }
  if (name.length > NAME_MAX_LENGTH) {
    return `Keep it under ${NAME_MAX_LENGTH + 1} characters.`;
  }
  if (!NAME_PATTERN.test(name)) {
    return "Letters, numbers, spaces and - _ . ' only.";
  }
  return null;
}

function profileRef(uid: string) {
  return doc(getDb(), "users", uid);
}

/**
 * Live-subscribes to the player's profile. Emits `null` when the document does
 * not exist yet, which is what puts a new player on the name screen.
 */
export function subscribeToProfile(
  uid: string,
  onChange: (profile: PlayerProfile | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    profileRef(uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }

      const data = snapshot.data();
      const name = typeof data.name === "string" ? data.name.trim() : "";

      if (!name) {
        onChange(null);
        return;
      }

      onChange({
        uid,
        name,
        email: typeof data.email === "string" ? data.email : null,
        photoURL: typeof data.photoURL === "string" ? data.photoURL : null,
        avatar: normalizeAvatar(data.avatar),
      });
    },
    (error) => onError(error),
  );
}

export async function createProfile(input: {
  uid: string;
  name: string;
  email: string | null;
  photoURL: string | null;
  avatar: AvatarSpec;
}): Promise<void> {
  await setDoc(
    profileRef(input.uid),
    {
      uid: input.uid,
      name: input.name.trim(),
      email: input.email,
      photoURL: input.photoURL,
      avatar: input.avatar,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function updateProfile(
  uid: string,
  changes: Partial<Pick<PlayerProfile, "name" | "avatar">>,
): Promise<void> {
  const patch: Record<string, unknown> = { updatedAt: serverTimestamp() };

  if (changes.name !== undefined) patch.name = changes.name.trim();
  if (changes.avatar !== undefined) patch.avatar = changes.avatar;

  await setDoc(profileRef(uid), patch, { merge: true });
}

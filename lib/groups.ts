import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore";

import { normalizeAvatar } from "@/lib/avatar";
import { getDb } from "@/lib/firebase";
import {
  CHAT_MAX,
  type ChatMessage,
  type GroupMember,
  type GroupSummary,
} from "@/lib/game-types";

/** Firestore hands back a Timestamp, or null while the server value is pending. */
export function toMillis(value: unknown): number | null {
  const stamp = value as Timestamp | null | undefined;
  return stamp && typeof stamp.toMillis === "function" ? stamp.toMillis() : null;
}

export function subscribeToMyGroups(
  uid: string,
  onChange: (groups: GroupSummary[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(getDb(), "groups"),
    where("memberIds", "array-contains", uid),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const groups = snapshot.docs.map((entry) => {
        const data = entry.data();
        return {
          id: entry.id,
          name: typeof data.name === "string" ? data.name : "Group",
          ownerId: typeof data.ownerId === "string" ? data.ownerId : "",
          inviteCode: typeof data.inviteCode === "string" ? data.inviteCode : "",
          memberIds: Array.isArray(data.memberIds) ? (data.memberIds as string[]) : [],
          createdAt: toMillis(data.createdAt),
        } satisfies GroupSummary;
      });

      // Newest first, with pending server timestamps treated as brand new.
      groups.sort((a, b) => (b.createdAt ?? Infinity) - (a.createdAt ?? Infinity));
      onChange(groups);
    },
    onError,
  );
}

export function subscribeToGroup(
  groupId: string,
  onChange: (group: GroupSummary | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getDb(), "groups", groupId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }

      const data = snapshot.data();
      onChange({
        id: snapshot.id,
        name: typeof data.name === "string" ? data.name : "Group",
        ownerId: typeof data.ownerId === "string" ? data.ownerId : "",
        inviteCode: typeof data.inviteCode === "string" ? data.inviteCode : "",
        memberIds: Array.isArray(data.memberIds) ? (data.memberIds as string[]) : [],
        createdAt: toMillis(data.createdAt),
      });
    },
    onError,
  );
}

export function subscribeToMembers(
  groupId: string,
  ownerId: string,
  onChange: (members: GroupMember[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(getDb(), `groups/${groupId}/members`),
    (snapshot) => {
      const members = snapshot.docs.map((entry) => {
        const data = entry.data();
        return {
          uid: entry.id,
          name: typeof data.name === "string" ? data.name : "Player",
          avatar: normalizeAvatar(data.avatar),
          isOwner: entry.id === ownerId,
          lastSeen: toMillis(data.lastSeen),
        } satisfies GroupMember;
      });

      // Owner first, then alphabetical, so the list does not jump around.
      members.sort((a, b) => {
        if (a.isOwner !== b.isOwner) return a.isOwner ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      onChange(members);
    },
    onError,
  );
}

export function subscribeToMessages(
  groupId: string,
  onChange: (messages: ChatMessage[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(getDb(), `groups/${groupId}/messages`),
    orderBy("createdAt", "desc"),
    limit(150),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map((entry) => {
        const data = entry.data();
        return {
          id: entry.id,
          authorId: typeof data.authorId === "string" ? data.authorId : "",
          authorName: typeof data.authorName === "string" ? data.authorName : "Player",
          authorAvatar: normalizeAvatar(data.authorAvatar),
          text: typeof data.text === "string" ? data.text : "",
          createdAt: toMillis(data.createdAt),
        } satisfies ChatMessage;
      });

      onChange(messages.reverse());
    },
    onError,
  );
}

export async function sendGroupMessage(input: {
  groupId: string;
  authorId: string;
  authorName: string;
  authorAvatar: unknown;
  text: string;
}): Promise<void> {
  const text = input.text.trim().slice(0, CHAT_MAX);
  if (!text) return;

  await addDoc(collection(getDb(), `groups/${input.groupId}/messages`), {
    authorId: input.authorId,
    authorName: input.authorName,
    authorAvatar: input.authorAvatar,
    text,
    createdAt: serverTimestamp(),
  });
}

/** Heartbeat write that keeps this player showing as active in the group. */
export async function touchPresence(groupId: string, uid: string): Promise<void> {
  await setDoc(
    doc(getDb(), `groups/${groupId}/members/${uid}`),
    { lastSeen: serverTimestamp() },
    { merge: true },
  );
}

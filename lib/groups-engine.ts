import { FieldValue } from "firebase-admin/firestore";

import { HttpError, adminDb } from "@/lib/firebase-admin";
import { GROUP_NAME_MAX } from "@/lib/game-types";
import { normalizeAvatar } from "@/lib/avatar";

/** Unambiguous alphabet: no O/0, I/1, so codes survive being read aloud. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeInviteCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

async function loadProfile(uid: string) {
  const snap = await adminDb().doc(`users/${uid}`).get();
  if (!snap.exists) throw new HttpError(400, "Finish setting up your profile first.");

  const data = snap.data() ?? {};
  return {
    name: typeof data.name === "string" ? data.name : "Player",
    avatar: normalizeAvatar(data.avatar),
  };
}

export async function createGroup(uid: string, rawName: unknown) {
  const name = typeof rawName === "string" ? rawName.trim() : "";
  if (name.length < 2 || name.length > GROUP_NAME_MAX) {
    throw new HttpError(400, `Group name must be 2-${GROUP_NAME_MAX} characters.`);
  }

  const profile = await loadProfile(uid);
  const db = adminDb();
  const groupRef = db.collection("groups").doc();

  await groupRef.set({
    name,
    ownerId: uid,
    inviteCode: makeInviteCode(),
    memberIds: [uid],
    createdAt: FieldValue.serverTimestamp(),
  });

  await groupRef.collection("members").doc(uid).set({
    uid,
    name: profile.name,
    avatar: profile.avatar,
    joinedAt: FieldValue.serverTimestamp(),
    lastSeen: FieldValue.serverTimestamp(),
  });

  return { groupId: groupRef.id };
}

export async function joinGroup(uid: string, rawCode: unknown) {
  const code = typeof rawCode === "string" ? rawCode.trim().toUpperCase() : "";
  if (!code) throw new HttpError(400, "Enter an invite code.");

  const db = adminDb();
  const found = await db
    .collection("groups")
    .where("inviteCode", "==", code)
    .limit(1)
    .get();

  if (found.empty) throw new HttpError(404, "No group with that invite code.");

  const groupRef = found.docs[0].ref;
  const profile = await loadProfile(uid);

  await groupRef.update({ memberIds: FieldValue.arrayUnion(uid) });
  // merge:true keeps joinedAt if they were in this group before.
  await groupRef.collection("members").doc(uid).set(
    {
      uid,
      name: profile.name,
      avatar: profile.avatar,
      joinedAt: FieldValue.serverTimestamp(),
      lastSeen: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { groupId: groupRef.id };
}

export async function removeMember(uid: string, rawGroupId: unknown, rawTarget: unknown) {
  const groupId = typeof rawGroupId === "string" ? rawGroupId : "";
  const target = typeof rawTarget === "string" ? rawTarget : "";
  if (!groupId || !target) throw new HttpError(400, "Missing group or member.");

  const db = adminDb();
  const groupRef = db.doc(`groups/${groupId}`);
  const snap = await groupRef.get();
  if (!snap.exists) throw new HttpError(404, "Group not found.");

  const ownerId = snap.data()?.ownerId as string | undefined;
  const leavingSelf = target === uid;

  if (!leavingSelf && ownerId !== uid) {
    throw new HttpError(403, "Only the group owner can remove members.");
  }
  if (leavingSelf && ownerId === uid) {
    throw new HttpError(400, "The owner can't leave their own group.");
  }

  await groupRef.update({ memberIds: FieldValue.arrayRemove(target) });
  await groupRef.collection("members").doc(target).delete();

  return { removed: target };
}

/** Dispatches one group action. The route handler adds auth on top of this. */
export async function runGroupAction(
  uid: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  switch (body.action) {
    case "create":
      return createGroup(uid, body.name);
    case "join":
      return joinGroup(uid, body.code);
    case "remove":
      return removeMember(uid, body.groupId, body.uid);
    default:
      throw new HttpError(400, "Unknown action.");
  }
}

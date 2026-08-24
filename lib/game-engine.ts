import { FieldValue, type Transaction } from "firebase-admin/firestore";

import WORDS from "@/data/words.json";
import { HttpError, adminDb } from "@/lib/firebase-admin";
import { CLUE_MAX, roundVoteOutcome, scoreMatch } from "@/lib/game-types";

const MIN_PLAYERS = 3;

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Two different words. The list has 5000 entries, so this retries almost never. */
function pickWords(): { crewWord: string; imposterWord: string } {
  const crewWord = WORDS[Math.floor(Math.random() * WORDS.length)];
  let imposterWord = crewWord;
  while (imposterWord === crewWord) {
    imposterWord = WORDS[Math.floor(Math.random() * WORDS.length)];
  }
  return { crewWord, imposterWord };
}

function pickImposters(playerIds: string[], count: number): string[] {
  const pool = [...playerIds];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

async function assertMember(groupId: string, uid: string) {
  const snap = await adminDb().doc(`groups/${groupId}/members/${uid}`).get();
  if (!snap.exists) throw new HttpError(403, "You are not in this group.");
}

/**
 * Creates a match and deals every player their private word. The words and the
 * imposter list never touch a document the players are allowed to read.
 */
async function dealMatch(input: {
  groupId: string;
  sessionId: string;
  number: number;
  playerIds: string[];
  imposterCount: number;
  revealImposters: boolean;
}) {
  const db = adminDb();
  const matchRef = db.collection(`groups/${input.groupId}/matches`).doc();
  const { crewWord, imposterWord } = pickWords();
  const imposterIds = pickImposters(input.playerIds, input.imposterCount);
  const imposters = new Set(imposterIds);

  const batch = db.batch();

  batch.set(matchRef, {
    sessionId: input.sessionId,
    number: input.number,
    phase: "clues",
    round: 1,
    cluesSubmitted: [],
    roundVotesSubmitted: [],
    verdictVotesSubmitted: [],
    lastTally: null,
    results: null,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Rules deny every client read here; only the server ever opens it.
  batch.set(matchRef.collection("secret").doc("deal"), {
    imposterIds,
    crewWord,
    imposterWord,
  });

  for (const uid of input.playerIds) {
    const isImposter = imposters.has(uid);
    batch.set(matchRef.collection("roles").doc(uid), {
      word: isImposter ? imposterWord : crewWord,
      // Only flagged when the host enabled it, otherwise they must work it out.
      isImposter: input.revealImposters ? isImposter : false,
      told: input.revealImposters,
    });
  }

  batch.update(db.doc(`groups/${input.groupId}/sessions/${input.sessionId}`), {
    currentMatchId: matchRef.id,
    matchNumber: input.number,
  });

  await batch.commit();
  return matchRef.id;
}

export async function startSession(uid: string, body: Record<string, unknown>) {
  const groupId = str(body.groupId);
  const playerIds = Array.isArray(body.playerIds)
    ? body.playerIds.filter((p): p is string => typeof p === "string")
    : [];
  const imposterCount = Number(body.imposterCount);
  const revealImposters = Boolean(body.revealImposters);

  await assertMember(groupId, uid);

  if (playerIds.length < MIN_PLAYERS) {
    throw new HttpError(400, `Pick at least ${MIN_PLAYERS} players.`);
  }
  if (new Set(playerIds).size !== playerIds.length) {
    throw new HttpError(400, "Duplicate player in the list.");
  }
  if (!Number.isInteger(imposterCount) || imposterCount < 1) {
    throw new HttpError(400, "Need at least one imposter.");
  }
  if (imposterCount > playerIds.length - 1) {
    throw new HttpError(400, "Too many imposters for that many players.");
  }

  const db = adminDb();
  const members = await db.collection(`groups/${groupId}/members`).get();
  const memberIds = new Set(members.docs.map((doc) => doc.id));
  for (const player of playerIds) {
    if (!memberIds.has(player)) throw new HttpError(400, "Someone left the group.");
  }

  const active = await db
    .collection(`groups/${groupId}/sessions`)
    .where("status", "==", "active")
    .limit(1)
    .get();
  if (!active.empty) throw new HttpError(409, "A game is already running in this group.");

  const sessionRef = db.collection(`groups/${groupId}/sessions`).doc();
  await sessionRef.set({
    hostId: uid,
    status: "active",
    playerIds,
    imposterCount,
    revealImposters,
    scores: Object.fromEntries(playerIds.map((p) => [p, 0])),
    matchNumber: 0,
    currentMatchId: null,
    createdAt: FieldValue.serverTimestamp(),
  });

  const matchId = await dealMatch({
    groupId,
    sessionId: sessionRef.id,
    number: 1,
    playerIds,
    imposterCount,
    revealImposters,
  });

  return { sessionId: sessionRef.id, matchId };
}

/** Loads the match and its session inside a transaction, with the usual checks. */
async function loadMatch(
  tx: Transaction,
  groupId: string,
  matchId: string,
  uid: string,
) {
  const db = adminDb();
  const matchRef = db.doc(`groups/${groupId}/matches/${matchId}`);
  const matchSnap = await tx.get(matchRef);
  if (!matchSnap.exists) throw new HttpError(404, "Match not found.");

  const match = matchSnap.data() ?? {};
  const sessionRef = db.doc(`groups/${groupId}/sessions/${match.sessionId}`);
  const sessionSnap = await tx.get(sessionRef);
  if (!sessionSnap.exists) throw new HttpError(404, "Game not found.");

  const playerIds = (sessionSnap.data()?.playerIds ?? []) as string[];
  if (!playerIds.includes(uid)) throw new HttpError(403, "You are not in this game.");

  return { matchRef, match, sessionRef, playerIds };
}

export async function submitClue(uid: string, body: Record<string, unknown>) {
  const groupId = str(body.groupId);
  const matchId = str(body.matchId);
  const text = str(body.text).trim();

  if (!text) throw new HttpError(400, "Write a clue first.");
  if (text.length > CLUE_MAX) {
    throw new HttpError(400, `Keep clues under ${CLUE_MAX + 1} characters.`);
  }

  await adminDb().runTransaction(async (tx) => {
    const { matchRef, match, playerIds } = await loadMatch(tx, groupId, matchId, uid);

    if (match.phase !== "clues") throw new HttpError(409, "The clue round is over.");

    const submitted = (match.cluesSubmitted ?? []) as string[];
    if (submitted.includes(uid)) throw new HttpError(409, "You already sent your clue.");

    const round = match.round as number;

    tx.set(matchRef.collection("clues").doc(`${round}_${uid}`), {
      uid,
      round,
      text,
      createdAt: FieldValue.serverTimestamp(),
    });

    const next = [...submitted, uid];
    const everyoneIn = playerIds.every((p) => next.includes(p));

    tx.update(matchRef, {
      cluesSubmitted: next,
      ...(everyoneIn ? { phase: "roundVote", roundVotesSubmitted: [] } : {}),
    });
  });

  return { ok: true };
}

export async function submitRoundVote(uid: string, body: Record<string, unknown>) {
  const groupId = str(body.groupId);
  const matchId = str(body.matchId);
  const choice = str(body.choice);

  if (choice !== "verdict" && choice !== "another") {
    throw new HttpError(400, "Pick verdict or another round.");
  }

  await adminDb().runTransaction(async (tx) => {
    const { matchRef, match, playerIds } = await loadMatch(tx, groupId, matchId, uid);

    if (match.phase !== "roundVote") throw new HttpError(409, "Not voting right now.");

    const submitted = (match.roundVotesSubmitted ?? []) as string[];
    if (submitted.includes(uid)) throw new HttpError(409, "You already voted.");

    const round = match.round as number;
    const votesRef = matchRef.collection("roundVotes");

    // Read every existing choice before writing, so the tally is complete.
    const priorVotes = await tx.get(votesRef.where("round", "==", round));
    const counts = { verdict: 0, another: 0 };
    for (const doc of priorVotes.docs) {
      if (doc.data().choice === "verdict") counts.verdict += 1;
      else counts.another += 1;
    }
    if (choice === "verdict") counts.verdict += 1;
    else counts.another += 1;

    tx.set(votesRef.doc(`${round}_${uid}`), { uid, round, choice });

    const next = [...submitted, uid];
    const everyoneIn = playerIds.every((p) => next.includes(p));

    if (!everyoneIn) {
      tx.update(matchRef, { roundVotesSubmitted: next });
      return;
    }

    const outcome = roundVoteOutcome(counts.verdict, playerIds.length);

    tx.update(matchRef, {
      roundVotesSubmitted: next,
      lastTally: { round, verdict: counts.verdict, another: counts.another, outcome },
      ...(outcome === "verdict"
        ? { phase: "verdict", verdictVotesSubmitted: [] }
        : { phase: "clues", round: round + 1, cluesSubmitted: [] }),
    });
  });

  return { ok: true };
}

export async function submitVerdictVote(uid: string, body: Record<string, unknown>) {
  const groupId = str(body.groupId);
  const matchId = str(body.matchId);
  const target = str(body.target);

  await adminDb().runTransaction(async (tx) => {
    const { matchRef, match, sessionRef, playerIds } = await loadMatch(
      tx,
      groupId,
      matchId,
      uid,
    );

    if (match.phase !== "verdict") throw new HttpError(409, "Not verdict time yet.");
    if (!playerIds.includes(target)) {
      throw new HttpError(400, "That player is not in the game.");
    }
    if (target === uid) throw new HttpError(400, "You cannot accuse yourself.");

    const submitted = (match.verdictVotesSubmitted ?? []) as string[];
    if (submitted.includes(uid)) {
      throw new HttpError(409, "You already accused someone.");
    }

    const votesRef = matchRef.collection("verdictVotes");
    const priorVotes = await tx.get(votesRef);
    const votes: Record<string, string> = {};
    for (const doc of priorVotes.docs) votes[doc.id] = doc.data().target as string;
    votes[uid] = target;

    const next = [...submitted, uid];
    const everyoneIn = playerIds.every((p) => next.includes(p));

    // The deal must be read before any write in this transaction.
    const dealSnap = everyoneIn
      ? await tx.get(matchRef.collection("secret").doc("deal"))
      : null;

    tx.set(votesRef.doc(uid), { uid, target });

    if (!everyoneIn || !dealSnap) {
      tx.update(matchRef, { verdictVotesSubmitted: next });
      return;
    }

    const deal = dealSnap.data() ?? {};
    const imposterIds = (deal.imposterIds ?? []) as string[];
    const points = scoreMatch(playerIds, imposterIds, votes);

    tx.update(matchRef, {
      verdictVotesSubmitted: next,
      phase: "results",
      results: {
        imposterIds,
        crewWord: deal.crewWord ?? "",
        imposterWord: deal.imposterWord ?? "",
        votes,
        points,
      },
    });

    const bumps: Record<string, FieldValue> = {};
    for (const [player, gained] of Object.entries(points)) {
      bumps[`scores.${player}`] = FieldValue.increment(gained);
    }
    tx.update(sessionRef, bumps);
  });

  return { ok: true };
}

export async function nextMatch(uid: string, body: Record<string, unknown>) {
  const groupId = str(body.groupId);
  const sessionId = str(body.sessionId);

  const db = adminDb();
  const sessionSnap = await db.doc(`groups/${groupId}/sessions/${sessionId}`).get();
  if (!sessionSnap.exists) throw new HttpError(404, "Game not found.");

  const session = sessionSnap.data() ?? {};
  if (session.status !== "active") throw new HttpError(409, "This game already ended.");
  if (session.hostId !== uid) {
    throw new HttpError(403, "Only the host can deal the next game.");
  }

  const currentId = session.currentMatchId as string | null;
  if (currentId) {
    const current = await db.doc(`groups/${groupId}/matches/${currentId}`).get();
    if (current.data()?.phase !== "results") {
      throw new HttpError(409, "Finish the current game first.");
    }
  }

  const matchId = await dealMatch({
    groupId,
    sessionId,
    number: (session.matchNumber as number) + 1,
    playerIds: (session.playerIds ?? []) as string[],
    imposterCount: session.imposterCount as number,
    revealImposters: Boolean(session.revealImposters),
  });

  return { matchId };
}

export async function endSession(uid: string, body: Record<string, unknown>) {
  const groupId = str(body.groupId);
  const sessionId = str(body.sessionId);

  const sessionRef = adminDb().doc(`groups/${groupId}/sessions/${sessionId}`);
  const snap = await sessionRef.get();
  if (!snap.exists) throw new HttpError(404, "Game not found.");
  if (snap.data()?.hostId !== uid) {
    throw new HttpError(403, "Only the host can end the game.");
  }

  await sessionRef.update({
    status: "ended",
    endedAt: FieldValue.serverTimestamp(),
  });
  return { ok: true };
}

/** Dispatches one game action. The route handler adds auth on top of this. */
export async function runGameAction(
  uid: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  switch (body.action) {
    case "start":
      return startSession(uid, body);
    case "clue":
      return submitClue(uid, body);
    case "roundVote":
      return submitRoundVote(uid, body);
    case "verdictVote":
      return submitVerdictVote(uid, body);
    case "next":
      return nextMatch(uid, body);
    case "end":
      return endSession(uid, body);
    default:
      throw new HttpError(400, "Unknown action.");
  }
}

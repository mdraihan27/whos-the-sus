import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from "firebase/firestore";

import { getDb } from "@/lib/firebase";
import { toMillis } from "@/lib/groups";
import type {
  Clue,
  GameMatch,
  GameSession,
  MatchPhase,
  MatchResults,
  MyRole,
  RoundVoteTally,
} from "@/lib/game-types";

const PHASES: MatchPhase[] = ["clues", "roundVote", "verdict", "results"];

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/**
 * The group's most recent game, running or finished. Finished ones stick around
 * so the final points table can be shown after the last match.
 */
export function subscribeToLatestSession(
  groupId: string,
  onChange: (session: GameSession | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(getDb(), `groups/${groupId}/sessions`),
    orderBy("createdAt", "desc"),
    limit(1),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const entry = snapshot.docs[0];
      if (!entry) {
        onChange(null);
        return;
      }

      const data = entry.data();
      onChange({
        id: entry.id,
        hostId: typeof data.hostId === "string" ? data.hostId : "",
        status: data.status === "ended" ? "ended" : "active",
        playerIds: stringArray(data.playerIds),
        imposterCount: Number(data.imposterCount) || 1,
        revealImposters: Boolean(data.revealImposters),
        scores: (data.scores ?? {}) as Record<string, number>,
        matchNumber: Number(data.matchNumber) || 0,
        currentMatchId:
          typeof data.currentMatchId === "string" ? data.currentMatchId : null,
      });
    },
    onError,
  );
}

export function subscribeToMatch(
  groupId: string,
  matchId: string,
  onChange: (match: GameMatch | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getDb(), `groups/${groupId}/matches/${matchId}`),
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }

      const data = snapshot.data();
      const phase = PHASES.includes(data.phase as MatchPhase)
        ? (data.phase as MatchPhase)
        : "clues";

      onChange({
        id: snapshot.id,
        sessionId: typeof data.sessionId === "string" ? data.sessionId : "",
        number: Number(data.number) || 1,
        phase,
        round: Number(data.round) || 1,
        cluesSubmitted: stringArray(data.cluesSubmitted),
        roundVotesSubmitted: stringArray(data.roundVotesSubmitted),
        verdictVotesSubmitted: stringArray(data.verdictVotesSubmitted),
        lastTally: (data.lastTally ?? null) as RoundVoteTally | null,
        results: (data.results ?? null) as MatchResults | null,
      });
    },
    onError,
  );
}

export function subscribeToClues(
  groupId: string,
  matchId: string,
  onChange: (clues: Clue[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(getDb(), `groups/${groupId}/matches/${matchId}/clues`),
    (snapshot) => {
      const clues = snapshot.docs.map((entry) => {
        const data = entry.data();
        return {
          id: entry.id,
          uid: typeof data.uid === "string" ? data.uid : "",
          round: Number(data.round) || 1,
          text: typeof data.text === "string" ? data.text : "",
          createdAt: toMillis(data.createdAt),
        } satisfies Clue;
      });

      // Oldest first; a clue still awaiting its server timestamp sorts last.
      clues.sort((a, b) => {
        if (a.round !== b.round) return a.round - b.round;
        return (a.createdAt ?? Infinity) - (b.createdAt ?? Infinity);
      });
      onChange(clues);
    },
    onError,
  );
}

/** Your own word. Firestore rules stop anyone else from reading this document. */
export function subscribeToMyRole(
  groupId: string,
  matchId: string,
  uid: string,
  onChange: (role: MyRole | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getDb(), `groups/${groupId}/matches/${matchId}/roles/${uid}`),
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }

      const data = snapshot.data();
      onChange({
        word: typeof data.word === "string" ? data.word : "",
        isImposter: Boolean(data.isImposter),
        told: Boolean(data.told),
      });
    },
    onError,
  );
}

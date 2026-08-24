import type { AvatarSpec } from "@/lib/avatar";

export type GroupSummary = {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  memberIds: string[];
  createdAt: number | null;
};

export type GroupMember = {
  uid: string;
  name: string;
  avatar: AvatarSpec;
  isOwner: boolean;
  lastSeen: number | null;
};

export type ChatMessage = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: AvatarSpec;
  text: string;
  createdAt: number | null;
};

export type MatchPhase = "clues" | "roundVote" | "verdict" | "results";

export type GameSession = {
  id: string;
  hostId: string;
  status: "active" | "ended";
  playerIds: string[];
  imposterCount: number;
  revealImposters: boolean;
  scores: Record<string, number>;
  matchNumber: number;
  currentMatchId: string | null;
};

export type RoundVoteTally = {
  round: number;
  verdict: number;
  another: number;
  outcome: "verdict" | "another";
};

export type MatchResults = {
  imposterIds: string[];
  crewWord: string;
  imposterWord: string;
  /** voter uid -> the uid they accused */
  votes: Record<string, string>;
  /** uid -> points earned in this match */
  points: Record<string, number>;
};

export type GameMatch = {
  id: string;
  sessionId: string;
  number: number;
  phase: MatchPhase;
  round: number;
  cluesSubmitted: string[];
  roundVotesSubmitted: string[];
  verdictVotesSubmitted: string[];
  lastTally: RoundVoteTally | null;
  results: MatchResults | null;
};

export type Clue = {
  id: string;
  uid: string;
  round: number;
  text: string;
  createdAt: number | null;
};

/** Only ever readable by the player it belongs to. */
export type MyRole = {
  word: string;
  isImposter: boolean;
  /** Null unless the host turned on "tell imposters they're imposters". */
  told: boolean;
};

export const GROUP_NAME_MAX = 30;
export const CHAT_MAX = 300;
export const CLUE_MAX = 60;

/** A player counts as active if they checked in this recently. */
export const PRESENCE_WINDOW_MS = 60_000;
export const HEARTBEAT_MS = 20_000;

export function isActive(lastSeen: number | null, now: number): boolean {
  return lastSeen !== null && now - lastSeen < PRESENCE_WINDOW_MS;
}

/** Verdict needs a strict majority; anything else means one more round. */
export function roundVoteOutcome(
  verdictVotes: number,
  totalPlayers: number,
): "verdict" | "another" {
  return verdictVotes * 2 > totalPlayers ? "verdict" : "another";
}

/**
 * Non-imposters score by correctly accusing an imposter.
 * Imposters score by drawing no accusations at all.
 */
export function scoreMatch(
  playerIds: string[],
  imposterIds: string[],
  votes: Record<string, string>,
): Record<string, number> {
  const imposters = new Set(imposterIds);
  const accused = new Set(Object.values(votes));
  const points: Record<string, number> = {};

  for (const uid of playerIds) {
    if (imposters.has(uid)) {
      points[uid] = accused.has(uid) ? 0 : 1;
    } else {
      points[uid] = imposters.has(votes[uid] ?? "") ? 1 : 0;
    }
  }

  return points;
}

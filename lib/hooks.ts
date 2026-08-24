"use client";

import { useEffect, useState } from "react";

import { HEARTBEAT_MS } from "@/lib/game-types";
import { touchPresence } from "@/lib/groups";

/** Keeps writing a heartbeat so this player shows as active to the group. */
export function usePresence(groupId: string | null, uid: string | null) {
  useEffect(() => {
    if (!groupId || !uid) return;

    let stopped = false;
    const beat = () => {
      if (!stopped) void touchPresence(groupId, uid).catch(() => {});
    };

    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [groupId, uid]);
}

/** A clock that ticks, so "active now" badges expire on their own. */
export function useNow(intervalMs = 10_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}

/** Copy-to-clipboard with a short-lived "Copied" acknowledgement. */
export function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  return [
    copied,
    (text: string) => {
      void navigator.clipboard.writeText(text).then(
        () => setCopied(true),
        () => setCopied(false),
      );
    },
  ];
}

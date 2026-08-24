"use client";

import { useEffect, useRef, useState } from "react";

import { PlayerAvatar } from "@/components/player-avatar";
import { CHAT_MAX, type ChatMessage } from "@/lib/game-types";
import { sendGroupMessage } from "@/lib/groups";
import type { PlayerProfile } from "@/lib/profile";

function timeLabel(millis: number | null): string {
  if (millis === null) return "sending…";
  return new Date(millis).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function GroupChat({
  groupId,
  profile,
  messages,
}: {
  groupId: string;
  profile: PlayerProfile;
  messages: ChatMessage[] | null;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const count = messages?.length ?? 0;

  // Follow the conversation as new messages land.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [count]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const body = text.trim();
    if (!body) return;

    setText("");
    setError(null);
    try {
      await sendGroupMessage({
        groupId,
        authorId: profile.uid,
        authorName: profile.name,
        authorAvatar: profile.avatar,
        text: body,
      });
    } catch {
      setText(body);
      setError("Message didn't send. Try again.");
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-2xl border-2 border-border shadow-sm bg-white/90">
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages === null ? (
          <p className="text-sm text-sky-600">Loading chat…</p>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-sky-600">
            No messages yet. Say hi 👋
          </p>
        ) : (
          messages.map((message) => {
            const mine = message.authorId === profile.uid;
            return (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}
              >
                <PlayerAvatar
                  spec={message.authorAvatar}
                  size={28}
                  className="ring-1 ring-sky-200"
                  title={message.authorName}
                />
                <div className={`max-w-[75%] ${mine ? "text-right" : ""}`}>
                  <p className="px-1 text-[11px] text-sky-600">
                    {mine ? "You" : message.authorName} · {timeLabel(message.createdAt)}
                  </p>
                  <p
                    className={`mt-0.5 inline-block break-words rounded-2xl px-3.5 py-2 text-sm ${
                      mine
                        ? "rounded-br-sm bg-sky-400 hover:bg-sky-500 text-sky-900"
                        : "rounded-bl-sm bg-bubble text-sky-600"
                    }`}
                  >
                    {message.text}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSend} className="flex gap-2 border-t border-border border-2 shadow-sm p-3">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={CHAT_MAX}
          placeholder="Message the crew…"
          className="min-w-0 flex-1 rounded-xl border-2 border-border shadow-sm bg-bubble/80 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-sky-600 focus:border-sky-300"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="rounded-xl bg-sky-400 hover:bg-sky-500 px-4 py-2.5 text-sm font-semibold transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </form>

      {error ? (
        <p className="px-3 pb-3 text-xs text-rose-300">{error}</p>
      ) : null}
    </div>
  );
}

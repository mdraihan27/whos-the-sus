"use client";

import type { MyRole } from "@/lib/game-types";

export function WordCard({ role }: { role: MyRole | null }) {
  if (!role) {
    return (
      <div className="rounded-2xl border-2 border-border shadow-sm bg-white/90 p-6 text-center">
        <p className="text-sm text-sky-600">Dealing your word…</p>
      </div>
    );
  }

  // `told` is only true when the host chose to reveal roles. Otherwise the
  // server sends isImposter:false to everyone so nothing leaks.
  const outed = role.told && role.isImposter;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border-4 p-6 text-center shadow-lg transition-transform hover:-translate-y-1 ${
        outed
          ? "border-sus bg-rose-200"
          : "border-sky-400 bg-sky-200"
      }`}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-sky-900/50">
        Your word
      </p>
      <p className="mt-2 break-words text-4xl font-black tracking-tight">
        {role.word}
      </p>

      {role.told ? (
        <p
          className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold ${
            outed ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
          }`}
        >
          {outed ? "🤫 You are an IMPOSTER" : "✅ You are crew"}
        </p>
      ) : (
        <p className="mt-3 text-xs text-sky-900/45">
          Nobody knows who is who. Not even you.
        </p>
      )}
    </div>
  );
}

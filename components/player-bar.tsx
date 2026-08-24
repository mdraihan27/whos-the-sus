"use client";

import Link from "next/link";
import { useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { PlayerAvatar } from "@/components/player-avatar";
import { updateProfile, validateName } from "@/lib/profile";

export function PlayerBar({ back }: { back?: { href: string; label: string } }) {
  const { user, profile, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!profile || !user) return null;

  async function handleSave() {
    const errorMsg = validateName(editName);
    if (errorMsg) {
      setError(errorMsg);
      return;
    }
    setError(null);
    if (!user) return;
    try {
      await updateProfile(user.uid, { name: editName });
      setIsEditing(false);
    } catch (err) {
      setError("Failed to update name.");
    }
  }

  return (
    <header className="flex items-center gap-3 border-b-2 border-border shadow-sm bg-bubble/80 px-4 py-3 backdrop-blur sm:px-6">
      {back ? (
        <Link
          href={back.href}
          className="rounded-full border-2 border-border shadow-sm bg-white/90 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:border-sky-300 hover:text-sky-900"
        >
          &larr; {back.label}
        </Link>
      ) : (
        <Link href="/" className="text-lg font-black tracking-tight">
          Who&apos;s the <span className="text-sus">Sus</span>?
        </Link>
      )}

      <div className="ml-auto flex items-center gap-3">
        {isEditing ? (
          <div className="relative flex items-center gap-2">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-32 rounded-lg border-2 border-sky-300 bg-white px-2 py-1 text-sm outline-none transition focus:border-sky-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSave();
                if (e.key === "Escape") setIsEditing(false);
              }}
            />
            <button onClick={() => void handleSave()} className="text-xs font-bold text-emerald-600 hover:text-emerald-700">Save</button>
            <button onClick={() => setIsEditing(false)} className="text-xs font-bold text-rose-500 hover:text-rose-600">Cancel</button>
            {error && <span className="absolute -bottom-5 left-0 whitespace-nowrap text-[10px] font-bold text-rose-600">{error}</span>}
          </div>
        ) : (
          <div className="group hidden items-center gap-1.5 sm:flex">
            <span className="text-sm font-semibold text-sky-700">
              {profile.name}
            </span>
            <button
              onClick={() => {
                setEditName(profile.name);
                setIsEditing(true);
                setError(null);
              }}
              className="text-[10px] opacity-40 transition-opacity hover:opacity-100"
              title="Edit name"
            >
              ✏️
            </button>
          </div>
        )}
        <PlayerAvatar
          spec={profile.avatar}
          size={34}
          className="ring-2 ring-sky-200"
          title={profile.name}
        />
        <button
          type="button"
          onClick={signOut}
          className="rounded-full border-2 border-border shadow-sm bg-white/90 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:border-sus hover:text-rose-600"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

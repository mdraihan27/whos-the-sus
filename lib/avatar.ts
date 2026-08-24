/**
 * Reddit-style random avatars: a crewmate in a random colour on a random
 * backdrop, with a random expression and accessory. The pick is made once at
 * sign-up and stored on the profile so it stays stable for that player.
 */

export type BodyColor = {
  id: string;
  base: string;
  dark: string;
  accent: string;
};

export type Backdrop = {
  id: string;
  from: string;
  to: string;
};

export const BODY_COLORS: BodyColor[] = [
  { id: "tomato", base: "#ff5f56", dark: "#c4302b", accent: "#ffd0cc" },
  { id: "tangerine", base: "#ff9f43", dark: "#c76b12", accent: "#ffe3c2" },
  { id: "banana", base: "#ffd93d", dark: "#c9a20b", accent: "#fff3c0" },
  { id: "lime", base: "#8ce14a", dark: "#549c18", accent: "#e0ffc4" },
  { id: "forest", base: "#2fbf71", dark: "#17804a", accent: "#c3f5da" },
  { id: "teal", base: "#2ec4c6", dark: "#128487", accent: "#c2f4f5" },
  { id: "ocean", base: "#3d9bff", dark: "#1a5fb4", accent: "#cfe4ff" },
  { id: "indigo", base: "#6f6bff", dark: "#3a35c4", accent: "#dcdbff" },
  { id: "violet", base: "#a86bff", dark: "#6c31c4", accent: "#ead9ff" },
  { id: "bubblegum", base: "#ff6bcb", dark: "#c22e93", accent: "#ffd4f0" },
  { id: "rose", base: "#ff7a8a", dark: "#c33a4c", accent: "#ffd6db" },
  { id: "cocoa", base: "#a9743f", dark: "#6f4718", accent: "#efd6bb" },
  { id: "slate", base: "#7c8aa5", dark: "#48536b", accent: "#dbe2ee" },
  { id: "mint", base: "#7ef2d0", dark: "#27a382", accent: "#d8fff3" },
];

export const BACKDROPS: Backdrop[] = [
  { id: "dawn", from: "#ffb36b", to: "#ff5f9e" },
  { id: "dusk", from: "#7b5cff", to: "#3a1c71" },
  { id: "deep", from: "#1f6feb", to: "#0b2a5b" },
  { id: "reactor", from: "#00c9a7", to: "#005f73" },
  { id: "airlock", from: "#f9d423", to: "#e65c00" },
  { id: "nebula", from: "#ff5edf", to: "#4b2fc4" },
  { id: "vent", from: "#4b5563", to: "#111827" },
  { id: "electric", from: "#43e97b", to: "#38f9d7" },
  { id: "cosmic", from: "#8ec5fc", to: "#e0c3fc" },
];

export const EYE_STYLES = [
  "dot",
  "happy",
  "wink",
  "sus",
  "star",
  "sleepy",
] as const;

export const ACCESSORIES = [
  "none",
  "none",
  "antenna",
  "cap",
  "sprout",
  "crown",
  "band",
] as const;

export type EyeStyle = (typeof EYE_STYLES)[number];
export type Accessory = (typeof ACCESSORIES)[number];

export type AvatarSpec = {
  color: string;
  backdrop: string;
  eyes: EyeStyle;
  accessory: Accessory;
};

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function randomAvatar(): AvatarSpec {
  return {
    color: pick(BODY_COLORS).id,
    backdrop: pick(BACKDROPS).id,
    eyes: pick(EYE_STYLES),
    accessory: pick(ACCESSORIES),
  };
}

/** Falls back to a valid avatar when Firestore holds a partial or stale shape. */
export function normalizeAvatar(value: unknown): AvatarSpec {
  const raw = (value ?? {}) as Partial<Record<keyof AvatarSpec, unknown>>;
  const color = BODY_COLORS.find((c) => c.id === raw.color)?.id;
  const backdrop = BACKDROPS.find((b) => b.id === raw.backdrop)?.id;
  const eyes = EYE_STYLES.find((e) => e === raw.eyes);
  const accessory = ACCESSORIES.find((a) => a === raw.accessory);

  return {
    color: color ?? BODY_COLORS[0].id,
    backdrop: backdrop ?? BACKDROPS[0].id,
    eyes: eyes ?? "dot",
    accessory: accessory ?? "none",
  };
}

export function resolveBodyColor(id: string): BodyColor {
  return BODY_COLORS.find((c) => c.id === id) ?? BODY_COLORS[0];
}

export function resolveBackdrop(id: string): Backdrop {
  return BACKDROPS.find((b) => b.id === id) ?? BACKDROPS[0];
}

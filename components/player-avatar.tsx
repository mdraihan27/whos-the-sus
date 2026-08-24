"use client";

import { useId } from "react";

import {
  resolveBackdrop,
  resolveBodyColor,
  type Accessory,
  type AvatarSpec,
  type EyeStyle,
} from "@/lib/avatar";

const BODY_PATH =
  "M 28 52 C 28 14, 74 14, 74 52 L 74 82 Q 74 90 66 90 L 60 90 C 56 77, 46 77, 42 90 L 36 90 Q 28 90 28 82 Z";

const LEFT_EYE_X = 53;
const RIGHT_EYE_X = 65;
const EYE_Y = 41;

function starPoints(cx: number, cy: number, radius: number) {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.45;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`);
  }
  return points.join(" ");
}

function Eyes({ style }: { style: EyeStyle }) {
  const ink = "#16233a";

  switch (style) {
    case "happy":
      return (
        <g fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round">
          <path d={`M${LEFT_EYE_X - 3.5} ${EYE_Y + 1.5} Q${LEFT_EYE_X} ${EYE_Y - 3} ${LEFT_EYE_X + 3.5} ${EYE_Y + 1.5}`} />
          <path d={`M${RIGHT_EYE_X - 3.5} ${EYE_Y + 1.5} Q${RIGHT_EYE_X} ${EYE_Y - 3} ${RIGHT_EYE_X + 3.5} ${EYE_Y + 1.5}`} />
        </g>
      );
    case "wink":
      return (
        <g>
          <circle cx={LEFT_EYE_X} cy={EYE_Y} r={3.4} fill={ink} />
          <path
            d={`M${RIGHT_EYE_X - 3.5} ${EYE_Y + 1.5} Q${RIGHT_EYE_X} ${EYE_Y - 3} ${RIGHT_EYE_X + 3.5} ${EYE_Y + 1.5}`}
            fill="none"
            stroke={ink}
            strokeWidth={3}
            strokeLinecap="round"
          />
        </g>
      );
    case "sus":
      return (
        <g fill={ink}>
          <rect x={LEFT_EYE_X - 3.4} y={EYE_Y - 1.6} width={6.8} height={3.6} rx={1.8} />
          <rect x={RIGHT_EYE_X - 3.4} y={EYE_Y - 1.6} width={6.8} height={3.6} rx={1.8} />
          <g stroke={ink} strokeWidth={1.8} strokeLinecap="round">
            <path d={`M${LEFT_EYE_X - 4} ${EYE_Y - 5.5} L${LEFT_EYE_X + 4} ${EYE_Y - 4}`} />
            <path d={`M${RIGHT_EYE_X + 4} ${EYE_Y - 5.5} L${RIGHT_EYE_X - 4} ${EYE_Y - 4}`} />
          </g>
        </g>
      );
    case "star":
      return (
        <g fill={ink}>
          <polygon points={starPoints(LEFT_EYE_X, EYE_Y, 4.4)} />
          <polygon points={starPoints(RIGHT_EYE_X, EYE_Y, 4.4)} />
        </g>
      );
    case "sleepy":
      return (
        <g fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round">
          <path d={`M${LEFT_EYE_X - 3.5} ${EYE_Y - 1} Q${LEFT_EYE_X} ${EYE_Y + 3.5} ${LEFT_EYE_X + 3.5} ${EYE_Y - 1}`} />
          <path d={`M${RIGHT_EYE_X - 3.5} ${EYE_Y - 1} Q${RIGHT_EYE_X} ${EYE_Y + 3.5} ${RIGHT_EYE_X + 3.5} ${EYE_Y - 1}`} />
        </g>
      );
    case "dot":
    default:
      return (
        <g fill={ink}>
          <circle cx={LEFT_EYE_X} cy={EYE_Y} r={3.6} />
          <circle cx={RIGHT_EYE_X} cy={EYE_Y} r={3.6} />
        </g>
      );
  }
}

/** Accessories keep enough contrast to read on every body colour. */
const INK = "#232b47";

function AccessoryMark({
  accessory,
  layer,
  dark,
  accent,
  clipId,
}: {
  accessory: Accessory;
  layer: "under" | "over";
  dark: string;
  accent: string;
  clipId: string;
}) {
  // The headband passes behind the visor, everything else sits on top.
  const wantsUnder = accessory === "band";
  if ((layer === "under") !== wantsUnder) return null;

  switch (accessory) {
    case "antenna":
      return (
        <g>
          <path
            d="M51 27 C 49 19, 45 16, 42 11"
            fill="none"
            stroke={dark}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <circle cx={41} cy={8.5} r={5} fill={accent} stroke={dark} strokeWidth={1.5} />
        </g>
      );
    case "cap":
      return (
        <g>
          {/* Clipped to the head so the crown follows the silhouette exactly.
              Uses the body's own dark shade, which stays legible on every backdrop. */}
          <g clipPath={`url(#${clipId})`}>
            <rect x={16} y={0} width={68} height={31} fill={dark} />
            <rect x={16} y={0} width={26} height={31} fill="#fff" opacity={0.12} />
          </g>
          <rect x={26} y={28} width={52} height={5.5} rx={2.75} fill={accent} />
        </g>
      );
    case "sprout":
      return (
        <g>
          <path d="M51 28 L51 13" stroke="#2f7d32" strokeWidth={3} strokeLinecap="round" />
          <ellipse cx={44} cy={12} rx={7} ry={4.4} transform="rotate(-25 44 12)" fill="#4ade80" />
          <ellipse cx={57} cy={15} rx={5.5} ry={3.6} transform="rotate(25 57 15)" fill="#22c55e" />
        </g>
      );
    case "crown":
      return (
        <g>
          <path
            d="M35 28 L37 13 L44 20 L51 9 L58 20 L65 13 L67 28 Z"
            fill="#fbbf24"
            stroke="#d97706"
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
          <circle cx={51} cy={22} r={2} fill="#fef3c7" />
        </g>
      );
    case "band":
      return (
        <g clipPath={`url(#${clipId})`}>
          <rect x={18} y={29} width={64} height={9} fill={INK} />
          <rect x={18} y={32} width={64} height={3} fill={accent} />
        </g>
      );
    case "none":
    default:
      return null;
  }
}

export function PlayerAvatar({
  spec,
  size = 96,
  className = "",
  title,
}: {
  spec: AvatarSpec;
  size?: number;
  className?: string;
  title?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const bgId = `bg-${uid}`;
  const clipId = `clip-${uid}`;
  const visorId = `visor-${uid}`;

  const body = resolveBodyColor(spec.color);
  const backdrop = resolveBackdrop(spec.backdrop);

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={title ?? "Player avatar"}
      className={`shrink-0 rounded-full ${className}`}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={backdrop.from} />
          <stop offset="100%" stopColor={backdrop.to} />
        </linearGradient>
        <linearGradient id={visorId} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#dff3ff" />
          <stop offset="100%" stopColor="#8fc7e8" />
        </linearGradient>
        <clipPath id={clipId}>
          <path d={BODY_PATH} />
        </clipPath>
      </defs>

      <rect width={100} height={100} fill={`url(#${bgId})`} />
      <circle cx={50} cy={62} r={40} fill="#000" opacity={0.08} />

      {/* backpack */}
      <rect x={15} y={46} width={17} height={28} rx={8} fill={body.dark} />

      {/* body */}
      <path d={BODY_PATH} fill={body.base} />
      <g clipPath={`url(#${clipId})`}>
        <path d="M60 10 L100 10 L100 100 L52 100 Z" fill={body.dark} opacity={0.18} />
        <ellipse cx={38} cy={30} rx={9} ry={13} fill="#fff" opacity={0.18} />
      </g>

      <AccessoryMark
        accessory={spec.accessory}
        layer="under"
        dark={body.dark}
        accent={body.accent}
        clipId={clipId}
      />

      {/* visor */}
      <rect x={44} y={32} width={30} height={19} rx={9.5} fill={`url(#${visorId})`} />
      <rect
        x={44}
        y={32}
        width={30}
        height={19}
        rx={9.5}
        fill="none"
        stroke={body.dark}
        strokeWidth={1.6}
        opacity={0.5}
      />
      <ellipse cx={51} cy={37.5} rx={4} ry={2.6} fill="#fff" opacity={0.75} />

      <Eyes style={spec.eyes} />
      <AccessoryMark
        accessory={spec.accessory}
        layer="over"
        dark={body.dark}
        accent={body.accent}
        clipId={clipId}
      />
    </svg>
  );
}

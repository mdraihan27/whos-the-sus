/**
 * Decorative backdrop. Positions come from a fixed seed so the server and the
 * client render identical markup (no hydration mismatch).
 */

function makeBubbles(count: number, seed: number) {
  let state = seed;
  const next = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${(next() * 100).toFixed(3)}%`,
    size: `${(next() * 40 + 10).toFixed(2)}px`,
    delay: `-${(next() * 20).toFixed(2)}s`,
    duration: `${(next() * 10 + 15).toFixed(2)}s`,
    opacity: (next() * 0.4 + 0.1).toFixed(2),
  }));
}

const BUBBLES = makeBubbles(40, 20260824);

export function Starfield() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-sky/50">
      <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-white/40 blur-3xl" />
      <div className="absolute -bottom-48 -right-32 h-[40rem] w-[40rem] rounded-full bg-cyan-200/30 blur-3xl" />
      {BUBBLES.map((bubble) => (
        <span
          key={bubble.id}
          className="absolute rounded-full bg-white/60 shadow-sm border border-white animate-float-up backdrop-blur-sm"
          style={{
            left: bubble.left,
            width: bubble.size,
            height: bubble.size,
            animationDelay: bubble.delay,
            animationDuration: bubble.duration,
            opacity: bubble.opacity,
          }}
        />
      ))}
    </div>
  );
}

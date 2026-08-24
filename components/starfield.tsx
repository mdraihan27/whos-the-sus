/**
 * Decorative backdrop. Positions come from a fixed seed so the server and the
 * client render identical markup (no hydration mismatch).
 */

export function Starfield() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-sky-50/50">
      <div className="absolute -left-40 -top-40 h-[40rem] w-[40rem] rounded-full bg-rose-200/40 blur-3xl" />
      <div className="absolute -bottom-40 -right-32 h-[45rem] w-[45rem] rounded-full bg-orange-100/40 blur-3xl" />
    </div>
  );
}

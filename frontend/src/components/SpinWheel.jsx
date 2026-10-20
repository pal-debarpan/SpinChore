import { useMemo } from "react";

// Curated palette of deep navy, indigo, and violet with subtle rich accents
const PALETTE = [
  "#1e1b4b", // midnight navy
  "#312e81", // deep indigo
  "#4338ca", // royal indigo
  "#5b21b6", // deep violet
  "#6d28d9", // royal violet
  "#1e3a8a", // navy blue
  "#4f46e5", // vibrant indigo
  "#7c3aed", // vibrant violet
  "#0f766e", // deep teal accent
  "#831843", // rich berry accent
];

export function SpinWheel({ names = [], spinning = false, rotation = 0, onSpin }) {
  const slices = useMemo(() => names.filter(Boolean), [names]);
  const count = Math.max(slices.length, 1);
  const angle = 360 / count;

  // Build conic gradient with subtle borders between segments
  const gradient = slices.length
    ? slices
        .map((_, index) => {
          const color = PALETTE[index % PALETTE.length];
          const start = index * angle;
          const end = (index + 1) * angle;
          return `${color} ${start}deg ${end - 0.4}deg, rgba(255, 255, 255, 0.25) ${end - 0.4}deg ${end}deg`;
        })
        .join(", ")
    : "#e2e8f0 0deg 360deg";

  return (
    <div className="relative mx-auto h-72 w-72 sm:h-80 sm:w-80 select-none">
      {/* Outer decorative halo/glow */}
      <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-brand-600/20 via-violet-500/10 to-indigo-600/25 blur-sm" />

      {/* Modern precision pointer at 12 o'clock */}
      <div className="pointer-events-none absolute -top-3 left-1/2 z-30 -translate-x-1/2 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]">
        <div className="flex flex-col items-center">
          <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-gradient-to-b from-rose-500 to-rose-600 shadow-sm">
            <div className="h-1.5 w-1.5 rounded-full bg-white shadow-inner" />
          </div>
          <div className="-mt-1 h-0 w-0 border-l-[7px] border-r-[7px] border-t-[11px] border-l-transparent border-r-transparent border-t-rose-600" />
        </div>
      </div>

      {/* The rotating wheel */}
      <div
        className={`relative h-full w-full rounded-full border-[8px] border-white shadow-[0_12px_40px_-10px_rgba(30,27,75,0.35)] ring-1 ring-stone-900/10 overflow-hidden ${
          spinning ? "ease-linear" : "ease-out"
        }`}
        style={{
          background: `conic-gradient(${gradient})`,
          transform: `rotate(${rotation}deg)`,
          transition: spinning
            ? "transform 0.4s linear"
            : "transform 2.6s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Subtle SVG overlay for inner rim and radial accents */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          <circle
            cx="50"
            cy="50"
            r="49"
            fill="none"
            stroke="rgba(255, 255, 255, 0.3)"
            strokeWidth="0.8"
          />
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="0.5"
            strokeDasharray="1.5 2.5"
          />
        </svg>

        {/* Roommate labels - centered precisely in each slice */}
        {slices.map((name, index) => {
          // Conic-gradient starts at 12 o'clock (0deg). In CSS, 12 o'clock is -90deg.
          const midAngle = index * angle + angle / 2;
          const textAngle = midAngle - 90;
          return (
            <span
              key={`${name}-${index}`}
              className="absolute left-1/2 top-1/2 origin-left text-[11px] sm:text-xs font-semibold tracking-wide text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] whitespace-nowrap"
              style={{
                transform: `rotate(${textAngle}deg) translate(52px, -50%)`,
                maxWidth: count > 4 ? "72px" : "88px",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={name}
            >
              {name.split(" ")[0]}
            </span>
          );
        })}
      </div>

      {/* Center refined button with clear SPIN label */}
      <button
        type="button"
        disabled={spinning || slices.length === 0}
        onClick={onSpin}
        aria-label="Spin wheel"
        className={`absolute left-1/2 top-1/2 z-20 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-gradient-to-b from-stone-900 via-indigo-950 to-stone-950 text-white shadow-[0_4px_18px_rgba(0,0,0,0.35)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
          spinning || slices.length === 0
            ? "cursor-not-allowed opacity-90 scale-95"
            : "hover:scale-105 active:scale-95 cursor-pointer hover:shadow-[0_6px_24px_rgba(79,70,229,0.5)] hover:border-brand-100"
        }`}
      >
        <span className="font-display text-[11px] font-black tracking-widest text-white drop-shadow">
          {spinning ? "···" : "SPIN"}
        </span>
      </button>
    </div>
  );
}

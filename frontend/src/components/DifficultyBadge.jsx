import { DIFFICULTY_LABELS, difficultyClass } from "../lib/difficulty.js";

export function DifficultyBadge({ value }) {
  const label = DIFFICULTY_LABELS[value] || "Unknown";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${difficultyClass(value)}`}
    >
      {value} · {label}
    </span>
  );
}

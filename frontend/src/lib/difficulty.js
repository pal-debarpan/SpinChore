export const DIFFICULTY_LABELS = {
  1: "Easy",
  2: "Light",
  3: "Medium",
  4: "Tough",
  5: "Hard",
};

export function difficultyClass(value) {
  const map = {
    1: "bg-emerald-50 text-emerald-800 border-emerald-200",
    2: "bg-lime-50 text-lime-800 border-lime-200",
    3: "bg-amber-50 text-amber-900 border-amber-200",
    4: "bg-orange-50 text-orange-900 border-orange-200",
    5: "bg-rose-50 text-rose-800 border-rose-200",
  };
  return map[value] || "bg-stone-100 text-stone-700 border-stone-200";
}

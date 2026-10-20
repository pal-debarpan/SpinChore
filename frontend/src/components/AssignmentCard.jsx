import { CheckCircle2, Circle } from "lucide-react";
import { DifficultyBadge } from "./DifficultyBadge.jsx";

export function AssignmentCard({ assignment, onComplete, busy }) {
  return (
    <article className="card flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-stone-500">{assignment.roommateName}</p>
          <h3 className="font-display text-xl">{assignment.choreName}</h3>
        </div>
        <DifficultyBadge value={assignment.difficulty} />
      </div>
      {assignment.choreDescription ? (
        <p className="text-sm text-stone-600">{assignment.choreDescription}</p>
      ) : null}
      <div className="mt-auto flex items-center justify-between">
        {assignment.isCompleted ? (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Done
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-sm text-amber-700">
            <Circle className="h-4 w-4" /> Open
          </span>
        )}
        {!assignment.isCompleted && onComplete ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onComplete(assignment)}
            className="rounded-full bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Mark complete
          </button>
        ) : null}
      </div>
    </article>
  );
}

import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";
import { AssignmentCard } from "../components/AssignmentCard.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { Spinner } from "../components/Spinner.jsx";
import { SpinWheel } from "../components/SpinWheel.jsx";
import { useToast } from "../components/Toast.jsx";

function getStoredWeek() {
  if (typeof window !== "undefined") {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlWeek = params.get("week");
      if (urlWeek) return urlWeek;
      return localStorage.getItem("spinchore_selected_week");
    } catch {
      return null;
    }
  }
  return null;
}

function persistWeek(weekStart) {
  if (typeof window !== "undefined") {
    try {
      if (weekStart) {
        localStorage.setItem("spinchore_selected_week", weekStart);
        const params = new URLSearchParams(window.location.search);
        if (params.get("week") !== weekStart) {
          params.set("week", weekStart);
          const newUrl = `${window.location.pathname}?${params.toString()}`;
          window.history.replaceState({}, "", newUrl);
        }
      }
    } catch {
      // Ignore storage/history errors
    }
  }
}

export function WeeklyAssignments() {
  const { push } = useToast();
  const [week, setWeek] = useState(null);
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [roommates, setRoommates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [startingNext, setStartingNext] = useState(false);
  const [error, setError] = useState("");
  const [winner, setWinner] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [busyId, setBusyId] = useState(null);

  async function load(targetWeek) {
    try {
      const weekToFetch = targetWeek ?? getStoredWeek();
      const fetchWeekPromise = (weekToFetch && api.assignmentsForWeek)
        ? api.assignmentsForWeek(weekToFetch)
        : api.currentAssignments();
      const fetchWeeksListPromise = api.weeks ? api.weeks().catch(() => []) : Promise.resolve([]);

      const [current, people, weekList] = await Promise.all([
        fetchWeekPromise,
        api.listRoommates(true),
        fetchWeeksListPromise,
      ]);
      setWeek(current);
      setRoommates(people);
      setAvailableWeeks(weekList || []);
      if (current?.weekStart) {
        persistWeek(current.weekStart);
      }
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const names = useMemo(() => {
    if (roommates?.length) {
      const active = roommates.filter((r) => r.is_active !== false).map((r) => r.name);
      if (active.length > 0) {
        return [...new Set(active)];
      }
    }
    if (week?.assignments?.length) {
      return [...new Set(week.assignments.map((row) => row.roommateName).filter(Boolean))];
    }
    return [];
  }, [week, roommates]);

  /** true when the current week has at least one assignment and all are completed */
  const allCompleted = useMemo(
    () =>
      Boolean(
        week?.assignments?.length &&
          week.assignments.every((a) => a.isCompleted)
      ),
    [week]
  );

  async function generate(force = false) {
    if (generating) return;
    setGenerating(true);
    setError("");
    const spin = setInterval(() => setRotation((value) => value + 48), 80);
    try {
      const [result, people, weekList] = await Promise.all([
        api.generateWeek({ weekStart: week?.weekStart, force }),
        api.listRoommates(true),
        api.weeks ? api.weeks().catch(() => []) : Promise.resolve([]),
      ]);
      setRoommates(people);
      setWeek(result);
      setAvailableWeeks(weekList || []);
      if (result?.weekStart) {
        persistWeek(result.weekStart);
      }
      const eligibleNames = people?.length
        ? [...new Set(people.filter((r) => r.is_active !== false).map((r) => r.name))]
        : [...new Set(result.assignments?.map((r) => r.roommateName).filter(Boolean))];
      const winnerName = result.assignments?.[0]?.roommateName;
      const winnerIndex = Math.max(
        0,
        eligibleNames.findIndex((name) => name === winnerName)
      );
      const winnerAssignment = result.assignments?.[0];
      if (winnerAssignment) {
        setWinner(winnerAssignment);
      }
      const slice = 360 / Math.max(eligibleNames.length, 1);
      setRotation((value) => value + 1080 + (360 - winnerIndex * slice));
      push(result.reused ? "This week already had assignments, so they were loaded instead of replaced." : "Fresh assignments saved.");
    } catch (err) {
      setError(err.message);
      push(err.message, "error");
    } finally {
      clearInterval(spin);
      setGenerating(false);
    }
  }

  async function startNext() {
    if (startingNext) return;
    setStartingNext(true);
    setError("");
    const spin = setInterval(() => setRotation((value) => value + 48), 80);
    try {
      const [result, people, weekList] = await Promise.all([
        api.startNextWeek(week?.weekStart),
        api.listRoommates(true),
        api.weeks ? api.weeks().catch(() => []) : Promise.resolve([]),
      ]);
      setRoommates(people);
      setWeek(result);
      setAvailableWeeks(weekList || []);
      if (result?.weekStart) {
        persistWeek(result.weekStart);
      }
      const eligibleNames = people?.length
        ? [...new Set(people.filter((r) => r.is_active !== false).map((r) => r.name))]
        : [...new Set(result.assignments?.map((r) => r.roommateName).filter(Boolean))];
      const winnerName = result.assignments?.[0]?.roommateName;
      const winnerIndex = Math.max(
        0,
        eligibleNames.findIndex((name) => name === winnerName)
      );
      const winnerAssignment = result.assignments?.[0];
      if (winnerAssignment) {
        setWinner(winnerAssignment);
      }
      const slice = 360 / Math.max(eligibleNames.length, 1);
      setRotation((value) => value + 1080 + (360 - winnerIndex * slice));
      push(result.reused ? "Next week's assignments were already saved." : "Next week's assignments generated!");
    } catch (err) {
      setError(err.message);
      push(err.message, "error");
    } finally {
      clearInterval(spin);
      setStartingNext(false);
    }
  }

  async function complete(assignment) {
    setBusyId(assignment.id);
    try {
      await api.completeChore(assignment.choreId, assignment.weekStart);
      push("Nice — marked complete");
      await load(assignment.weekStart);
    } catch (err) {
      push(err.message, "error");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <Spinner label="Loading this week's assignments" />;

  const isBusy = generating || startingNext;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-brand-700">Weekly spin</p>
            <h1 className="font-display text-4xl">Who's on the hook?</h1>
          </div>
          {availableWeeks.length > 1 && (
            <div className="flex items-center gap-2">
              <label htmlFor="week-select" className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Week
              </label>
              <select
                id="week-select"
                aria-label="Select week"
                value={week?.weekStart || ""}
                onChange={(e) => load(e.target.value)}
                className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-sm hover:border-stone-400 focus:border-brand-500 focus:outline-none"
              >
                {availableWeeks.map((w) => (
                  <option key={w.id || w.week_start} value={w.week_start}>
                    {w.week_start === week?.weekStart && week?.label ? week.label : w.week_start}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          The wheel is a presentation of roommate names. It does not pick the chores. The server fairness
          algorithm assigns every active chore, then this page animates while that result is saved or loaded.
        </p>
        {week?.label ? <p className="mt-1 text-sm text-stone-500">{week.label}</p> : null}
      </div>

      {allCompleted && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-4">
          <p className="font-semibold text-emerald-800">🎉 All chores for this week are done!</p>
          <p className="mt-1 text-sm text-emerald-700">
            This week's history is preserved. You can now spin up assignments for next week.
          </p>
          <button
            id="start-next-week-btn"
            type="button"
            disabled={isBusy}
            onClick={startNext}
            className="mt-3 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {startingNext ? "Generating next week…" : "Start Next Week"}
          </button>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[20rem_1fr]">
        <div className="card p-5">
          <SpinWheel
            names={names}
            spinning={isBusy}
            rotation={rotation}
            onSpin={() => generate(false)}
          />

          {winner && (
            <div className="mt-4 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/80 p-3 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white shadow-xs">
                    ★
                  </span>
                  <div className="text-left">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                      Wheel Selected
                    </p>
                    <p className="text-sm font-bold text-stone-900">
                      {winner.roommateName}
                    </p>
                  </div>
                </div>
                {winner.choreName && (
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-brand-700 border border-stone-200/80 shadow-xs">
                    Chore: {winner.choreName}
                  </span>
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={isBusy}
            onClick={() => generate(false)}
            className="mt-4 w-full rounded-full bg-gradient-to-r from-brand-600 via-indigo-600 to-brand-700 py-3 text-sm font-semibold text-white shadow-md hover:from-brand-700 hover:to-indigo-800 hover:shadow-lg disabled:opacity-60 transition-all duration-200"
          >
            {generating ? "Spinning and saving…" : "Generate this week's assignments"}
          </button>
          {week?.assignments?.length ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => generate(true)}
              className="mt-2 w-full rounded-full border border-stone-300 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60 transition-colors"
            >
              Explicitly regenerate this week
            </button>
          ) : null}
          <p className="mt-3 text-xs leading-5 text-stone-500 text-center">
            If assignments already exist, generate loads them. Regeneration is blocked after anyone marks a chore complete.
          </p>
        </div>

        <div>
          {error ? <p className="mb-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}
          {week?.assignments?.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {week.assignments.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  busy={busyId === assignment.id}
                  onComplete={complete}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nothing assigned yet"
              body="Add at least one active roommate and chore, then generate. Until then the household board stays empty on purpose."
            />
          )}
        </div>
      </div>
    </div>
  );
}

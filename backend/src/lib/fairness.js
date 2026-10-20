/**
 * Fair weekly chore assignment.
 *
 * The backend is the source of truth. This module scores roommate–chore pairings
 * and searches for a low-penalty complete assignment. It is intentionally
 * randomized so repeated runs are not identical, but it is biased toward fairness.
 *
 * cost = repeatPenalty + recentHardChorePenalty + cumulativeImbalancePenalty + loadPenalty
 *
 * Weights:
 * - repeatLastWeek: strong penalty if the same person had this chore last week
 * - repeatRecent: milder penalty if they had it earlier in the lookback window
 * - recentHard: penalty if last week's chores included difficulty >= hardThreshold
 * - cumulativeImbalance: penalty when a roommate is already above mean total difficulty
 * - load: keeps chore counts as even as possible in the current week
 *
 * Limitations: this is a heuristic search, not a globally optimal solver.
 */

export const DEFAULT_WEIGHTS = {
  repeatLastWeek: 80,
  repeatRecent: 25,
  recentHard: 12,
  cumulativeImbalance: 8,
  load: 40,
  lookbackWeeks: 6,
  hardThreshold: 4,
  candidateCount: 48,
  topK: 5,
  jitter: 0.2,
};

export function createRng(seed = Date.now()) {
  let state = seed >>> 0;
  if (state === 0) state = 1;
  return function rng() {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function shuffleInPlace(items, rng) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function byId(items) {
  const map = new Map();
  for (const item of items) map.set(item.id, item);
  return map;
}

function previousWeekIds(historyWeeks, currentWeekStart, limit) {
  const previous = historyWeeks
    .filter((week) => week.weekStart < currentWeekStart)
    .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1))
    .slice(0, limit);
  return previous;
}

function buildHistoryIndex(assignments, previousWeeks) {
  const weekRank = new Map(previousWeeks.map((week, index) => [week.id, index]));
  const byRoommate = new Map();

  for (const assignment of assignments) {
    if (!weekRank.has(assignment.weekId)) continue;
    const list = byRoommate.get(assignment.roommateId) ?? [];
    list.push({
      ...assignment,
      recency: weekRank.get(assignment.weekId),
    });
    byRoommate.set(assignment.roommateId, list);
  }

  return { byRoommate, lastWeekId: previousWeeks[0]?.id ?? null };
}

function cumulativeDifficulty(byRoommate, roommateId) {
  const list = byRoommate.get(roommateId) ?? [];
  return list.reduce((sum, item) => sum + Number(item.difficulty ?? 0), 0);
}

export function pairingCost({
  roommateId,
  chore,
  alreadyAssignedCounts,
  history,
  meanCumulative,
  weights,
}) {
  const list = history.byRoommate.get(roommateId) ?? [];
  let cost = 0;

  const sameChore = list.filter((item) => item.choreId === chore.id);
  if (sameChore.some((item) => item.weekId === history.lastWeekId)) {
    cost += weights.repeatLastWeek;
  } else if (sameChore.length > 0) {
    const recency = Math.min(...sameChore.map((item) => item.recency));
    cost += weights.repeatRecent * (1 - recency / Math.max(weights.lookbackWeeks, 1));
  }

  const lastWeekChores = list.filter((item) => item.weekId === history.lastWeekId);
  const lastWeekMax = lastWeekChores.reduce(
    (max, item) => Math.max(max, Number(item.difficulty ?? 0)),
    0
  );
  if (lastWeekMax >= weights.hardThreshold) {
    cost += weights.recentHard * lastWeekMax;
  }

  const currentCum = cumulativeDifficulty(history.byRoommate, roommateId);
  const projected = currentCum + chore.difficulty;
  cost += weights.cumulativeImbalance * Math.max(0, projected - meanCumulative);

  const counts = [...alreadyAssignedCounts.values()];
  const minCount = counts.length ? Math.min(...counts) : 0;
  const roommateCount = alreadyAssignedCounts.get(roommateId) ?? 0;
  cost += weights.load * (roommateCount - minCount);

  return cost;
}

function maxPerRoommate(choreCount, roommateCount) {
  if (roommateCount === 0) return 0;
  return Math.ceil(choreCount / roommateCount);
}

export function generateAssignmentPlan({
  roommates,
  chores,
  historyWeeks = [],
  historyAssignments = [],
  currentWeekStart,
  weights = DEFAULT_WEIGHTS,
  rng = createRng(),
}) {
  const activeRoommates = roommates.filter((person) => person.isActive !== false);
  const activeChores = chores.filter((chore) => chore.isActive !== false);

  if (activeRoommates.length === 0) {
    const error = new Error("Need at least one active roommate to generate assignments");
    error.status = 400;
    error.code = "NO_ACTIVE_ROOMMATES";
    throw error;
  }
  if (activeChores.length === 0) {
    const error = new Error("Need at least one active chore to generate assignments");
    error.status = 400;
    error.code = "NO_ACTIVE_CHORES";
    throw error;
  }

  const previousWeeks = previousWeekIds(
    historyWeeks,
    currentWeekStart,
    weights.lookbackWeeks
  );
  const history = buildHistoryIndex(historyAssignments, previousWeeks);
  const cumulatives = activeRoommates.map((person) =>
    cumulativeDifficulty(history.byRoommate, person.id)
  );
  const meanCumulative =
    cumulatives.reduce((sum, value) => sum + value, 0) / Math.max(cumulatives.length, 1);
  const cap = maxPerRoommate(activeChores.length, activeRoommates.length);

  const candidates = [];
  for (let i = 0; i < weights.candidateCount; i += 1) {
    const orderedChores = shuffleInPlace([...activeChores], rng);
    const counts = new Map(activeRoommates.map((person) => [person.id, 0]));
    const plan = [];
    let totalCost = 0;
    let valid = true;

    for (const chore of orderedChores) {
      const eligible = activeRoommates.filter((person) => counts.get(person.id) < cap);
      if (eligible.length === 0) {
        valid = false;
        break;
      }

      let best = null;
      for (const person of eligible) {
        const base = pairingCost({
          roommateId: person.id,
          chore,
          alreadyAssignedCounts: counts,
          history,
          meanCumulative,
          weights,
        });
        const cost = base + rng() * weights.jitter;
        if (!best || cost < best.cost) {
          best = { person, cost, base };
        }
      }

      plan.push({
        roommateId: best.person.id,
        choreId: chore.id,
        difficulty: chore.difficulty,
        cost: best.base,
      });
      counts.set(best.person.id, counts.get(best.person.id) + 1);
      totalCost += best.base;
    }

    if (!valid) continue;
    candidates.push({ plan, totalCost, counts });
  }

  if (candidates.length === 0) {
    const error = new Error("Could not produce a valid assignment plan");
    error.status = 500;
    error.code = "ASSIGNMENT_FAILED";
    throw error;
  }

  candidates.sort((a, b) => a.totalCost - b.totalCost);
  const shortlist = candidates.slice(0, Math.min(weights.topK, candidates.length));
  const pick = shortlist[Math.floor(rng() * shortlist.length)];

  const roommateMap = byId(activeRoommates);
  const choreMap = byId(activeChores);

  return {
    assignments: pick.plan.map((row) => ({
      roommateId: row.roommateId,
      choreId: row.choreId,
      roommateName: roommateMap.get(row.roommateId)?.name,
      choreName: choreMap.get(row.choreId)?.name,
      difficulty: row.difficulty,
    })),
    totalCost: pick.totalCost,
    weights,
  };
}

export function summarizeFairness(assignments, roommates) {
  const byRoommate = new Map(roommates.map((person) => [person.id, { name: person.name, count: 0, difficulty: 0, hardCount: 0 }]));
  for (const row of assignments) {
    const bucket = byRoommate.get(row.roommateId);
    if (!bucket) continue;
    bucket.count += 1;
    bucket.difficulty += Number(row.difficulty ?? 0);
    if (Number(row.difficulty ?? 0) >= 4) bucket.hardCount += 1;
  }
  return [...byRoommate.entries()].map(([id, stats]) => ({ roommateId: id, ...stats }));
}

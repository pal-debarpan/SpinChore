import { describe, expect, it } from "vitest";
import {
  DEFAULT_WEIGHTS,
  createRng,
  generateAssignmentPlan,
  pairingCost,
} from "./fairness.js";

function people(names) {
  return names.map((name, index) => ({
    id: `r${index + 1}`,
    name,
    isActive: true,
  }));
}

function chores(specs) {
  return specs.map((spec, index) => ({
    id: `c${index + 1}`,
    name: spec.name,
    difficulty: spec.difficulty,
    isActive: true,
  }));
}

describe("assignment constraints", () => {
  it("assigns every active chore exactly once", () => {
    const plan = generateAssignmentPlan({
      roommates: people(["Avery", "Jordan", "Sam"]),
      chores: chores([
        { name: "Kitchen", difficulty: 3 },
        { name: "Bath", difficulty: 5 },
        { name: "Trash", difficulty: 2 },
        { name: "Vacuum", difficulty: 2 },
      ]),
      currentWeekStart: "2026-10-19",
      rng: createRng(7),
    });
    const choreIds = plan.assignments.map((row) => row.choreId);
    expect(choreIds.sort()).toEqual(["c1", "c2", "c3", "c4"]);
    expect(new Set(choreIds).size).toBe(4);
  });

  it("never assigns inactive roommates or chores", () => {
    const plan = generateAssignmentPlan({
      roommates: [
        { id: "r1", name: "Avery", isActive: true },
        { id: "r2", name: "Gone", isActive: false },
      ],
      chores: [
        { id: "c1", name: "Kitchen", difficulty: 3, isActive: true },
        { id: "c2", name: "Retired", difficulty: 5, isActive: false },
      ],
      currentWeekStart: "2026-10-19",
      rng: createRng(3),
    });
    expect(plan.assignments).toHaveLength(1);
    expect(plan.assignments[0].roommateId).toBe("r1");
    expect(plan.assignments[0].choreId).toBe("c1");
  });

  it("spreads extra chores when there are more chores than roommates", () => {
    const plan = generateAssignmentPlan({
      roommates: people(["Avery", "Jordan"]),
      chores: chores([
        { name: "A", difficulty: 1 },
        { name: "B", difficulty: 2 },
        { name: "C", difficulty: 3 },
        { name: "D", difficulty: 4 },
        { name: "E", difficulty: 5 },
      ]),
      currentWeekStart: "2026-10-19",
      rng: createRng(11),
    });
    const counts = {};
    for (const row of plan.assignments) {
      counts[row.roommateId] = (counts[row.roommateId] || 0) + 1;
    }
    expect(plan.assignments).toHaveLength(5);
    expect(Math.max(...Object.values(counts)) - Math.min(...Object.values(counts))).toBeLessThanOrEqual(1);
  });

  it("leaves some roommates unassigned when there are extra people", () => {
    const plan = generateAssignmentPlan({
      roommates: people(["Avery", "Jordan", "Sam", "Riley"]),
      chores: chores([
        { name: "Kitchen", difficulty: 3 },
        { name: "Trash", difficulty: 2 },
      ]),
      currentWeekStart: "2026-10-19",
      rng: createRng(21),
    });
    const uniquePeople = new Set(plan.assignments.map((row) => row.roommateId));
    expect(plan.assignments).toHaveLength(2);
    expect(uniquePeople.size).toBe(2);
  });

  it("throws when no active roommates exist", () => {
    expect(() =>
      generateAssignmentPlan({
        roommates: [{ id: "r1", name: "Gone", isActive: false }],
        chores: chores([{ name: "Kitchen", difficulty: 3 }]),
        currentWeekStart: "2026-10-19",
        rng: createRng(1),
      })
    ).toThrow(/roommate/i);
  });
});

describe("fairness penalties", () => {
  it("penalizes repeating last week's chore more than an older repeat", () => {
    const chore = { id: "c1", difficulty: 3 };
    const lastWeek = pairingCost({
      roommateId: "r1",
      chore,
      alreadyAssignedCounts: new Map([["r1", 0]]),
      history: {
        lastWeekId: "w1",
        byRoommate: new Map([
          ["r1", [{ choreId: "c1", weekId: "w1", recency: 0, difficulty: 3 }]],
        ]),
      },
      meanCumulative: 3,
      weights: DEFAULT_WEIGHTS,
    });
    const older = pairingCost({
      roommateId: "r1",
      chore,
      alreadyAssignedCounts: new Map([["r1", 0]]),
      history: {
        lastWeekId: "w1",
        byRoommate: new Map([
          ["r1", [{ choreId: "c1", weekId: "w0", recency: 3, difficulty: 3 }]],
        ]),
      },
      meanCumulative: 3,
      weights: DEFAULT_WEIGHTS,
    });
    expect(lastWeek).toBeGreaterThan(older);
  });
});

describe("multi-week simulation", () => {
  it("keeps cumulative difficulty reasonably balanced and avoids obvious repeats", () => {
    const roommates = people(["Avery", "Jordan", "Sam", "Riley"]);
    const choreList = chores([
      { name: "Bath", difficulty: 5 },
      { name: "Fridge", difficulty: 4 },
      { name: "Kitchen", difficulty: 3 },
      { name: "Trash", difficulty: 2 },
    ]);
    const historyWeeks = [];
    const historyAssignments = [];
    const pairCounts = new Map();
    const hardCounts = Object.fromEntries(roommates.map((person) => [person.id, 0]));
    const totals = Object.fromEntries(roommates.map((person) => [person.id, 0]));
    let consecutiveRepeats = 0;

    for (let week = 0; week < 16; week += 1) {
      const monday = new Date(Date.UTC(2026, 0, 5));
      monday.setUTCDate(monday.getUTCDate() + week * 7);
      const weekStart = monday.toISOString().slice(0, 10);
      const weekId = `w${week}`;
      const previousByPersonChore = new Set(
        historyAssignments
          .filter((row) => row.weekId === historyWeeks[0]?.id)
          .map((row) => `${row.roommateId}:${row.choreId}`)
      );
      const plan = generateAssignmentPlan({
        roommates,
        chores: choreList,
        historyWeeks,
        historyAssignments,
        currentWeekStart: weekStart,
        rng: createRng(100 + week),
      });

      for (const row of plan.assignments) {
        const key = `${row.roommateId}:${row.choreId}`;
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
        totals[row.roommateId] += row.difficulty;
        if (row.difficulty >= 4) hardCounts[row.roommateId] += 1;
        if (previousByPersonChore.has(key)) consecutiveRepeats += 1;
        historyAssignments.push({
          weekId,
          roommateId: row.roommateId,
          choreId: row.choreId,
          difficulty: row.difficulty,
        });
      }
      historyWeeks.unshift({ id: weekId, weekStart });
    }

    const values = Object.values(totals);
    const spread = Math.max(...values) - Math.min(...values);
    const hardValues = Object.values(hardCounts);
    const hardSpread = Math.max(...hardValues) - Math.min(...hardValues);

    expect(spread).toBeLessThanOrEqual(18);
    expect(hardSpread).toBeLessThanOrEqual(8);
    expect(consecutiveRepeats).toBeLessThanOrEqual(6);
    expect(Math.max(...pairCounts.values())).toBeLessThanOrEqual(8);
  });
});

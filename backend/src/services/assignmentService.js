import { generateAssignmentPlan, summarizeFairness } from "../lib/fairness.js";
import { endOfWeekSunday, normalizeWeekStart, nextWeekStart, weekLabel } from "../lib/week.js";
import { badRequest, conflict, notFound } from "../http/errors.js";
import { throwIfDbError } from "../db/errors.js";

const ASSIGNMENT_SELECT = `
  id,
  week_id,
  roommate_id,
  chore_id,
  assigned_at,
  completed_at,
  roommates ( id, name, is_active ),
  chores ( id, name, description, difficulty, is_active ),
  weeks ( id, week_start )
`;

function mapAssignment(row) {
  return {
    id: row.id,
    weekId: row.week_id,
    weekStart: row.weeks?.week_start ?? null,
    roommateId: row.roommate_id,
    roommateName: row.roommates?.name ?? null,
    roommateActive: row.roommates?.is_active ?? null,
    choreId: row.chore_id,
    choreName: row.chores?.name ?? null,
    choreDescription: row.chores?.description ?? null,
    difficulty: row.chores?.difficulty ?? null,
    assignedAt: row.assigned_at,
    completedAt: row.completed_at,
    isCompleted: Boolean(row.completed_at),
  };
}

export function createAssignmentService(db, { rngFactory } = {}) {
  async function ensureWeek(weekStart) {
    const { data, error } = await db.rpc("ensure_week", { p_week_start: weekStart });
    throwIfDbError(error);
    return data;
  }

  async function listForWeekId(weekId) {
    const { data, error } = await db
      .from("assignments")
      .select(ASSIGNMENT_SELECT)
      .eq("week_id", weekId)
      .order("assigned_at", { ascending: true });
    throwIfDbError(error);
    return (data ?? []).map(mapAssignment);
  }

  async function getWeekByStart(weekStart) {
    const { data, error } = await db
      .from("weeks")
      .select("*")
      .eq("week_start", weekStart)
      .maybeSingle();
    throwIfDbError(error);
    return data;
  }

  async function loadHistory(currentWeekStart) {
    const { data: weeks, error: weekError } = await db
      .from("weeks")
      .select("id, week_start")
      .lt("week_start", currentWeekStart)
      .order("week_start", { ascending: false })
      .limit(8);
    throwIfDbError(weekError);

    const historyWeeks = (weeks ?? []).map((week) => ({
      id: week.id,
      weekStart: week.week_start,
    }));
    if (historyWeeks.length === 0) {
      return { historyWeeks, historyAssignments: [] };
    }

    const { data: rows, error } = await db
      .from("assignments")
      .select("week_id, roommate_id, chore_id, chores ( difficulty )")
      .in(
        "week_id",
        historyWeeks.map((week) => week.id)
      );
    throwIfDbError(error);

    return {
      historyWeeks,
      historyAssignments: (rows ?? []).map((row) => ({
        weekId: row.week_id,
        roommateId: row.roommate_id,
        choreId: row.chore_id,
        difficulty: row.chores?.difficulty ?? 1,
      })),
    };
  }

  async function insertPlan(weekId, plan) {
    const payload = plan.assignments.map((row) => ({
      week_id: weekId,
      roommate_id: row.roommateId,
      chore_id: row.choreId,
    }));
    const { error } = await db.from("assignments").insert(payload);
    if (error?.code === "23505") {
      return listForWeekId(weekId);
    }
    throwIfDbError(error);
    return listForWeekId(weekId);
  }

  return {
    async getWeekMeta(weekValue) {
      const weekStart = normalizeWeekStart(weekValue);
      if (!weekStart) throw badRequest("week must be a valid YYYY-MM-DD date", "INVALID_WEEK");
      return {
        weekStart,
        weekEnd: endOfWeekSunday(weekStart),
        label: weekLabel(weekStart),
        timezone: "UTC",
        rule: "Monday through Sunday, using the UTC calendar date",
      };
    },

    async listWeeks() {
      const { data, error } = await db
        .from("weeks")
        .select("id, week_start, created_at")
        .order("week_start", { ascending: false });
      throwIfDbError(error);
      return data ?? [];
    },

    async getAssignmentsForWeek(weekValue) {
      if (!weekValue) {
        const calWeekStart = normalizeWeekStart();
        const allWeeks = await this.listWeeks();
        const upcomingWeeks = allWeeks
          .filter((w) => w.week_start >= calWeekStart)
          .sort((a, b) => a.week_start.localeCompare(b.week_start));

        if (upcomingWeeks && upcomingWeeks.length > 0) {
          let activeWeekData = null;
          for (const w of upcomingWeeks) {
            const wAssignments = await listForWeekId(w.id);
            const isDone = wAssignments.length > 0 && wAssignments.every((a) => a.isCompleted);
            if (!isDone) {
              const meta = await this.getWeekMeta(w.week_start);
              activeWeekData = {
                ...meta,
                weekId: w.id,
                generated: wAssignments.length > 0,
                assignments: wAssignments,
              };
              break;
            }
          }
          if (activeWeekData) {
            return activeWeekData;
          }
          const latestWeek = upcomingWeeks[upcomingWeeks.length - 1];
          const latestAssignments = await listForWeekId(latestWeek.id);
          const meta = await this.getWeekMeta(latestWeek.week_start);
          return {
            ...meta,
            weekId: latestWeek.id,
            generated: latestAssignments.length > 0,
            assignments: latestAssignments,
          };
        }
      }

      const meta = await this.getWeekMeta(weekValue);
      const week = await getWeekByStart(meta.weekStart);
      if (!week) {
        return { ...meta, generated: false, assignments: [] };
      }
      const assignments = await listForWeekId(week.id);
      return {
        ...meta,
        weekId: week.id,
        generated: assignments.length > 0,
        assignments,
      };
    },

    async generateWeek({ weekStart: requested, force = false } = {}) {
      const meta = await this.getWeekMeta(requested);
      const weekId = await ensureWeek(meta.weekStart);
      const existing = await listForWeekId(weekId);

      const [{ data: roommates, error: roommateError }, { data: chores, error: choreError }] =
        await Promise.all([
          db.from("roommates").select("*").eq("is_active", true),
          db.from("chores").select("*").eq("is_active", true),
        ]);
      throwIfDbError(roommateError);
      throwIfDbError(choreError);

      const activeRoommates = roommates ?? [];
      const activeChores = chores ?? [];

      if (existing.length > 0) {
        const hasCompletions = existing.some((row) => row.isCompleted);

        if (force) {
          if (hasCompletions) {
            throw conflict(
              "This week already has completed chores. Regeneration would overwrite history.",
              "WEEK_HAS_COMPLETIONS"
            );
          }
        } else {
          if (hasCompletions) {
            return {
              ...meta,
              weekId,
              generated: false,
              reused: true,
              assignments: existing,
            };
          }

          const existingRoommateIds = new Set(existing.map((row) => row.roommateId));
          const existingChoreIds = new Set(existing.map((row) => row.choreId));
          const activeRoommateIds = new Set(activeRoommates.map((row) => row.id));
          const activeChoreIds = new Set(activeChores.map((row) => row.id));

          const hasDeactivatedAssignedRoommate = existing.some((row) => !activeRoommateIds.has(row.roommateId));
          const hasDeactivatedAssignedChore = existing.some((row) => !activeChoreIds.has(row.choreId));
          const hasUnassignedActiveChore = activeChores.some((c) => !existingChoreIds.has(c.id));

          const assignedTimes = existing.map((r) => new Date(r.assignedAt).getTime()).filter(Boolean);
          const minAssignedAt = assignedTimes.length ? Math.min(...assignedTimes) : 0;
          const hasNewActiveRoommate = activeRoommates.some(
            (r) =>
              !existingRoommateIds.has(r.id) &&
              (new Date(r.created_at).getTime() >= minAssignedAt - 1000 ||
               new Date(r.updated_at).getTime() >= minAssignedAt - 1000 ||
               activeChores.length >= activeRoommates.length)
          );

          const householdChanged =
            hasDeactivatedAssignedRoommate ||
            hasDeactivatedAssignedChore ||
            hasUnassignedActiveChore ||
            hasNewActiveRoommate;

          if (!householdChanged) {
            return {
              ...meta,
              weekId,
              generated: false,
              reused: true,
              assignments: existing,
            };
          }
        }
      }

      const { historyWeeks, historyAssignments } = await loadHistory(meta.weekStart);
      const plan = generateAssignmentPlan({
        roommates: activeRoommates.map((row) => ({
          id: row.id,
          name: row.name,
          isActive: row.is_active,
        })),
        chores: activeChores.map((row) => ({
          id: row.id,
          name: row.name,
          difficulty: row.difficulty,
          isActive: row.is_active,
        })),
        historyWeeks,
        historyAssignments,
        currentWeekStart: meta.weekStart,
        rng: rngFactory ? rngFactory() : undefined,
      });

      if (existing.length > 0) {
        const { error } = await db.rpc("replace_week_assignments", {
          p_week_id: weekId,
          p_rows: plan.assignments.map((row) => ({
            roommate_id: row.roommateId,
            chore_id: row.choreId,
          })),
        });
        throwIfDbError(error);
        const assignments = await listForWeekId(weekId);
        return { ...meta, weekId, generated: true, regenerated: true, assignments };
      }

      const assignments = await insertPlan(weekId, plan);
      return { ...meta, weekId, generated: true, regenerated: false, assignments };
    },

    async completeChore(choreId, { weekStart } = {}) {
      const meta = await this.getWeekMeta(weekStart);
      const week = await getWeekByStart(meta.weekStart);
      if (!week) {
        throw notFound("Assignment for this chore in the selected week");
      }

      const { data: rows, error } = await db
        .from("assignments")
        .select(ASSIGNMENT_SELECT)
        .eq("week_id", week.id)
        .eq("chore_id", choreId);
      throwIfDbError(error);
      if (!rows || rows.length === 0) {
        throw notFound("Assignment for this chore in the selected week");
      }
      if (rows.length > 1) {
        throw conflict("Multiple assignments found for this chore and week", "AMBIGUOUS_ASSIGNMENT");
      }

      const current = mapAssignment(rows[0]);
      if (current.completedAt) {
        return { ...current, alreadyCompleted: true };
      }

      const { data, error: updateError } = await db
        .from("assignments")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", current.id)
        .is("completed_at", null)
        .select(ASSIGNMENT_SELECT)
        .maybeSingle();
      throwIfDbError(updateError);

      if (!data) {
        const again = await listForWeekId(week.id);
        const match = again.find((row) => row.id === current.id);
        return { ...match, alreadyCompleted: true };
      }
      return { ...mapAssignment(data), alreadyCompleted: false };
    },

    async historyForRoommate(roommateId) {
      const { data: roommate, error: roommateError } = await db
        .from("roommates")
        .select("*")
        .eq("id", roommateId)
        .maybeSingle();
      throwIfDbError(roommateError);
      if (!roommate) throw notFound("Roommate");

      const { data, error } = await db
        .from("assignments")
        .select(ASSIGNMENT_SELECT)
        .eq("roommate_id", roommateId)
        .order("assigned_at", { ascending: false });
      throwIfDbError(error);
      const assignments = (data ?? []).map(mapAssignment);
      return {
        roommate,
        assignments,
        fairness: summarizeFairness(assignments, [roommate]),
      };
    },

    async dashboard(weekValue) {
      const week = await this.getAssignmentsForWeek(weekValue);
      const [{ data: roommates, error: rErr }, { data: chores, error: cErr }] = await Promise.all([
        db.from("roommates").select("*"),
        db.from("chores").select("*"),
      ]);
      throwIfDbError(rErr);
      throwIfDbError(cErr);

      const activeRoommates = (roommates ?? []).filter((row) => row.is_active);
      const activeChores = (chores ?? []).filter((row) => row.is_active);
      const completed = week.assignments.filter((row) => row.isCompleted).length;
      const total = week.assignments.length;
      const completionPercent = total === 0 ? 0 : Math.round((completed / total) * 100);
      const fairness = summarizeFairness(
        week.assignments,
        activeRoommates.map((row) => ({ id: row.id, name: row.name }))
      );

      const { data: allAssignments, error: aErr } = await db
        .from("assignments")
        .select("roommate_id, chores ( difficulty ), roommates ( name )");
      throwIfDbError(aErr);

      const historical = summarizeFairness(
        (allAssignments ?? []).map((row) => ({
          roommateId: row.roommate_id,
          difficulty: row.chores?.difficulty,
        })),
        (roommates ?? []).map((row) => ({ id: row.id, name: row.name }))
      );

      return {
        week,
        stats: {
          activeRoommates: activeRoommates.length,
          activeChores: activeChores.length,
          completedThisWeek: completed,
          totalThisWeek: total,
          completionPercent,
        },
        fairness,
        historicalFairness: historical,
      };
    },

    async allHistory() {
      const { data, error } = await db
        .from("assignments")
        .select(ASSIGNMENT_SELECT)
        .order("assigned_at", { ascending: false });
      throwIfDbError(error);
      const assignments = (data ?? []).map(mapAssignment);
      const { data: roommates, error: roommateError } = await db.from("roommates").select("id, name");
      throwIfDbError(roommateError);
      return {
        assignments,
        fairness: summarizeFairness(assignments, roommates ?? []),
      };
    },

    /**
     * Generate assignments for the next calendar week after `fromWeekStart` (defaults
     * to the current UTC week). Preserves the completed week's data entirely and
     * never touches it. Idempotent: if the next week is already generated it returns
     * those assignments unchanged (reused: true).
     */
    async startNextWeek({ fromWeekStart } = {}) {
      const currentMeta = await this.getWeekMeta(fromWeekStart);
      const targetWeekStart = nextWeekStart(currentMeta.weekStart);
      return this.generateWeek({ weekStart: targetWeekStart, force: false });
    },
  };
}

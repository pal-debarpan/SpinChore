import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createMemoryDb } from "./mockSupabase.js";
import { createRng } from "../src/lib/fairness.js";

let db;
let app;

beforeEach(() => {
  db = createMemoryDb();
  app = createApp({ db, corsOrigin: "http://localhost:5173", rngFactory: () => createRng(42) });
});

describe("health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.data.ok).toBe(true);
  });
});

describe("roommates", () => {
  it("creates and lists roommates", async () => {
    const created = await request(app).post("/roommates").send({ name: "  Avery Chen " });
    expect(created.status).toBe(201);
    expect(created.body.data.name).toBe("Avery Chen");

    const list = await request(app).get("/roommates");
    expect(list.body.data).toHaveLength(1);
  });

  it("rejects empty names", async () => {
    const res = await request(app).post("/roommates").send({ name: "   " });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_NAME");
  });

  it("updates a name and deactivates without deleting", async () => {
    const created = await request(app).post("/roommates").send({ name: "Jordan" });
    const id = created.body.data.id;
    const patched = await request(app).patch(`/roommates/${id}`).send({ name: "Jordan Blake" });
    expect(patched.body.data.name).toBe("Jordan Blake");

    const removed = await request(app).delete(`/roommates/${id}`);
    expect(removed.status).toBe(200);
    expect(removed.body.data.is_active).toBe(false);
    expect(db.store.roommates).toHaveLength(1);
  });

  it("returns 404 for unknown ids", async () => {
    const res = await request(app)
      .patch("/roommates/11111111-1111-4111-8111-111111111111")
      .send({ name: "Nope" });
    expect(res.status).toBe(404);
  });
});

describe("chores", () => {
  it("validates difficulty", async () => {
    const res = await request(app).post("/chores").send({ name: "Bath", difficulty: 9 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_DIFFICULTY");
  });

  it("creates, updates, and deactivates chores", async () => {
    const created = await request(app)
      .post("/chores")
      .send({ name: "Kitchen", description: "Wipe counters", difficulty: 3 });
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    const patched = await request(app).patch(`/chores/${id}`).send({ difficulty: 4 });
    expect(patched.body.data.difficulty).toBe(4);
    const removed = await request(app).delete(`/chores/${id}`);
    expect(removed.body.data.is_active).toBe(false);
  });
});

describe("assignments", () => {
  async function seedHousehold() {
    await request(app).post("/roommates").send({ name: "Avery" });
    await request(app).post("/roommates").send({ name: "Jordan" });
    await request(app).post("/chores").send({ name: "Kitchen", difficulty: 3 });
    await request(app).post("/chores").send({ name: "Bath", difficulty: 5 });
  }

  it("generates assignments and reuses them on duplicate generate", async () => {
    await seedHousehold();
    const first = await request(app).post("/assign/week").send({ weekStart: "2026-10-19" });
    expect(first.status).toBe(201);
    expect(first.body.data.assignments).toHaveLength(2);
    const ids = first.body.data.assignments.map((row) => row.id).sort();

    const second = await request(app).post("/assign/week").send({ weekStart: "2026-10-19" });
    expect(second.status).toBe(200);
    expect(second.body.data.reused).toBe(true);
    expect(second.body.data.assignments.map((row) => row.id).sort()).toEqual(ids);
  });

  it("completes a current-week chore once", async () => {
    await seedHousehold();
    const generated = await request(app).post("/assign/week").send({ weekStart: "2026-10-19" });
    const choreId = generated.body.data.assignments[0].choreId;
    const first = await request(app)
      .post(`/chores/${choreId}/complete`)
      .send({ weekStart: "2026-10-19" });
    expect(first.status).toBe(200);
    expect(first.body.data.isCompleted).toBe(true);
    const stamp = first.body.data.completedAt;

    const second = await request(app)
      .post(`/chores/${choreId}/complete`)
      .send({ weekStart: "2026-10-19" });
    expect(second.body.data.alreadyCompleted).toBe(true);
    expect(second.body.data.completedAt).toBe(stamp);
  });

  it("rejects completing a chore that is not assigned this week", async () => {
    await seedHousehold();
    await request(app).post("/assign/week").send({ weekStart: "2026-10-19" });
    const extra = await request(app).post("/chores").send({ name: "Windows", difficulty: 2 });
    const res = await request(app)
      .post(`/chores/${extra.body.data.id}/complete`)
      .send({ weekStart: "2026-10-19" });
    expect(res.status).toBe(404);
  });

  it("returns roommate history", async () => {
    await seedHousehold();
    await request(app).post("/assign/week").send({ weekStart: "2026-10-19" });
    const roommateId = db.store.roommates[0].id;
    const res = await request(app).get(`/history/${roommateId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.roommate.id).toBe(roommateId);
    expect(Array.isArray(res.body.data.assignments)).toBe(true);
  });

  it("refuses regeneration after a completion", async () => {
    await seedHousehold();
    const generated = await request(app).post("/assign/week").send({ weekStart: "2026-10-19" });
    const choreId = generated.body.data.assignments[0].choreId;
    await request(app).post(`/chores/${choreId}/complete`).send({ weekStart: "2026-10-19" });
    const again = await request(app)
      .post("/assign/week")
      .send({ weekStart: "2026-10-19", force: true });
    expect(again.status).toBe(409);
  });

  it("includes a newly added roommate in weekly assignment distribution", async () => {
    // 1. Create several roommates and chores
    await seedHousehold(); // Avery, Jordan; Kitchen, Bath
    await request(app).post("/roommates").send({ name: "Casey" });
    await request(app).post("/chores").send({ name: "Living Room", difficulty: 2 });
    await request(app).post("/chores").send({ name: "Trash", difficulty: 1 });

    // Add another roommate
    const newRoommateRes = await request(app).post("/roommates").send({ name: "Taylor" });
    expect(newRoommateRes.status).toBe(201);
    const newRoommateId = newRoommateRes.body.data.id;

    // Generate a new week's assignments
    const genRes = await request(app).post("/assign/week").send({ weekStart: "2026-10-26" });
    expect(genRes.status).toBe(201);
    expect(genRes.body.data.assignments).toHaveLength(4);

    // 2. Verify the new roommate is included in the assignment distribution
    const assignedRoommateIds = genRes.body.data.assignments.map((a) => a.roommateId);
    expect(assignedRoommateIds).toContain(newRoommateId);

    // 4. Verify saved assignments remain consistent between weekly dashboard and history
    const dashRes = await request(app).get("/dashboard?week=2026-10-26");
    expect(dashRes.status).toBe(200);
    const dashAssignments = dashRes.body.data.week.assignments;
    expect(dashAssignments.map((a) => a.id).sort()).toEqual(
      genRes.body.data.assignments.map((a) => a.id).sort()
    );

    const historyRes = await request(app).get(`/history/${newRoommateId}`);
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.assignments.length).toBeGreaterThanOrEqual(1);
    expect(historyRes.body.data.assignments[0].weekStart).toBe("2026-10-26");
  });

  it("regenerates to include newly added roommate when generated again before completions", async () => {
    // Existing week has assignments for Avery & Jordan
    await seedHousehold(); // Avery, Jordan, Kitchen, Bath
    const first = await request(app).post("/assign/week").send({ weekStart: "2026-10-19" });
    expect(first.status).toBe(201);
    expect(first.body.data.assignments).toHaveLength(2);

    // Add a new roommate and chore
    const morgan = await request(app).post("/roommates").send({ name: "Morgan" });
    await request(app).post("/chores").send({ name: "Recycling", difficulty: 1 });

    // Generate assignments again for this week without explicit force
    const second = await request(app).post("/assign/week").send({ weekStart: "2026-10-19" });
    expect(second.status).toBe(201);
    expect(second.body.data.assignments).toHaveLength(3);
    const assignedIds = second.body.data.assignments.map((a) => a.roommateId);
    expect(assignedIds).toContain(morgan.body.data.id);
  });

  it("startNextWeek generates assignments for the following Monday", async () => {
    await seedHousehold();
    // Generate and fully complete the current week
    const gen = await request(app).post("/assign/week").send({ weekStart: "2026-10-19" });
    expect(gen.status).toBe(201);
    for (const a of gen.body.data.assignments) {
      await request(app).post(`/chores/${a.choreId}/complete`).send({ weekStart: "2026-10-19" });
    }

    // Start next week via the dedicated endpoint
    const next = await request(app).post("/assign/next-week").send({ fromWeekStart: "2026-10-19" });
    expect(next.status).toBe(201);
    expect(next.body.data.weekStart).toBe("2026-10-26");
    expect(next.body.data.assignments).toHaveLength(2);
    expect(next.body.data.assignments.every((a) => !a.isCompleted)).toBe(true);
  });

  it("startNextWeek is idempotent — calling it twice returns reused:true on the second call", async () => {
    await seedHousehold();
    const gen = await request(app).post("/assign/week").send({ weekStart: "2026-10-19" });
    for (const a of gen.body.data.assignments) {
      await request(app).post(`/chores/${a.choreId}/complete`).send({ weekStart: "2026-10-19" });
    }

    const first = await request(app).post("/assign/next-week").send({ fromWeekStart: "2026-10-19" });
    expect(first.status).toBe(201);

    const second = await request(app).post("/assign/next-week").send({ fromWeekStart: "2026-10-19" });
    expect(second.status).toBe(200);
    expect(second.body.data.reused).toBe(true);
    // Same assignment IDs returned
    expect(second.body.data.assignments.map((a) => a.id).sort()).toEqual(
      first.body.data.assignments.map((a) => a.id).sort()
    );
  });

  it("startNextWeek preserves the completed week's data unchanged", async () => {
    await seedHousehold();
    const gen = await request(app).post("/assign/week").send({ weekStart: "2026-10-19" });
    const choreId = gen.body.data.assignments[0].choreId;
    await request(app).post(`/chores/${choreId}/complete`).send({ weekStart: "2026-10-19" });

    // Complete remaining chores too
    for (const a of gen.body.data.assignments.slice(1)) {
      await request(app).post(`/chores/${a.choreId}/complete`).send({ weekStart: "2026-10-19" });
    }

    await request(app).post("/assign/next-week").send({ fromWeekStart: "2026-10-19" });

    // Original week still exists with all completions intact
    const hist = await request(app).get("/assignments/2026-10-19");
    expect(hist.status).toBe(200);
    expect(hist.body.data.assignments).toHaveLength(2);
    expect(hist.body.data.assignments.every((a) => a.isCompleted)).toBe(true);

    // Force-regeneration of the completed week must still be blocked
    const blocked = await request(app)
      .post("/assign/week")
      .send({ weekStart: "2026-10-19", force: true });
    expect(blocked.status).toBe(409);
  });

  it("reloading current assignments after starting next week reopens the new week instead of reverting", async () => {
    await seedHousehold();
    // 1. Generate and complete all chores for current week
    const gen = await request(app).post("/assign/week").send({ weekStart: "2026-10-19" });
    for (const a of gen.body.data.assignments) {
      await request(app).post(`/chores/${a.choreId}/complete`).send({ weekStart: "2026-10-19" });
    }

    // 2. Start next week
    const nextRes = await request(app).post("/assign/next-week").send({ fromWeekStart: "2026-10-19" });
    expect(nextRes.status).toBe(201);
    expect(nextRes.body.data.weekStart).toBe("2026-10-26");

    // 3. Simulating page refresh / GET /assignments/current:
    // It should load the newly started week, not revert to the completed previous week
    const currentRes = await request(app).get("/assignments/current");
    expect(currentRes.status).toBe(200);
    expect(currentRes.body.data.weekStart).toBe("2026-10-26");
    expect(currentRes.body.data.assignments).toHaveLength(2);
    expect(currentRes.body.data.assignments.every((a) => !a.isCompleted)).toBe(true);

    // 4. Fetching by specific week returns the persisted week's data
    const specificNext = await request(app).get("/assignments/2026-10-26");
    expect(specificNext.status).toBe(200);
    expect(specificNext.body.data.weekStart).toBe("2026-10-26");
    expect(specificNext.body.data.assignments).toHaveLength(2);

    const specificPrev = await request(app).get("/assignments/2026-10-19");
    expect(specificPrev.status).toBe(200);
    expect(specificPrev.body.data.weekStart).toBe("2026-10-19");
    expect(specificPrev.body.data.assignments.every((a) => a.isCompleted)).toBe(true);
  });
});


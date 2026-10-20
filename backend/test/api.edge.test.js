/**
 * Edge-case and additional API tests for SpinChore backend.
 * Covers: dashboard endpoint, invalid week params, empty-household errors,
 * assignment retrieval, and history endpoints.
 */
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

async function seedHousehold() {
  await request(app).post("/roommates").send({ name: "Avery" });
  await request(app).post("/roommates").send({ name: "Jordan" });
  await request(app).post("/chores").send({ name: "Kitchen", difficulty: 3 });
  await request(app).post("/chores").send({ name: "Bath", difficulty: 5 });
}

describe("health", () => {
  it("includes the service name", async () => {
    const res = await request(app).get("/health");
    expect(res.body.data.service).toBe("spinchore-api");
  });
});

describe("week validation", () => {
  it("GET /assignments/:week with a non-date string returns 400", async () => {
    const res = await request(app).get("/assignments/not-a-date");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_WEEK");
  });

  it("GET /assignments/:week normalises a mid-week date to Monday", async () => {
    await seedHousehold();
    // Generate for the Monday 2026-10-19
    await request(app).post("/assign/week").send({ weekStart: "2026-10-19" });
    // Querying with a Wednesday in the same week should return the same data
    const res = await request(app).get("/assignments/2026-10-21");
    expect(res.status).toBe(200);
    expect(res.body.data.weekStart).toBe("2026-10-19");
    expect(res.body.data.assignments).toHaveLength(2);
  });

  it("POST /assign/week with a bad weekStart date returns 400", async () => {
    await seedHousehold();
    const res = await request(app).post("/assign/week").send({ weekStart: "2026-13-99" });
    expect(res.status).toBe(400);
  });
});

describe("empty-household errors", () => {
  it("returns 400 when no active roommates exist", async () => {
    await request(app).post("/chores").send({ name: "Kitchen", difficulty: 2 });
    const res = await request(app).post("/assign/week").send({ weekStart: "2026-10-19" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("NO_ACTIVE_ROOMMATES");
  });

  it("returns 400 when no active chores exist", async () => {
    await request(app).post("/roommates").send({ name: "Avery" });
    const res = await request(app).post("/assign/week").send({ weekStart: "2026-10-19" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("NO_ACTIVE_CHORES");
  });
});

describe("dashboard endpoint", () => {
  it("returns stats, week, and fairness without assignments", async () => {
    await seedHousehold();
    const res = await request(app).get("/dashboard");
    expect(res.status).toBe(200);
    const { stats, week, fairness } = res.body.data;
    expect(stats.activeRoommates).toBe(2);
    expect(stats.activeChores).toBe(2);
    expect(stats.completionPercent).toBe(0);
    expect(week.generated).toBe(false);
    expect(Array.isArray(fairness)).toBe(true);
  });

  it("reflects completions in stats", async () => {
    await seedHousehold();
    const gen = await request(app).post("/assign/week").send({ weekStart: "2026-10-19" });
    const choreId = gen.body.data.assignments[0].choreId;
    await request(app).post(`/chores/${choreId}/complete`).send({ weekStart: "2026-10-19" });
    const res = await request(app).get("/dashboard?week=2026-10-19");
    expect(res.body.data.stats.completedThisWeek).toBe(1);
    expect(res.body.data.stats.completionPercent).toBe(50);
  });
});

describe("GET /assignments/current", () => {
  it("returns an empty assignment list when nothing is generated", async () => {
    const res = await request(app).get("/assignments/current");
    expect(res.status).toBe(200);
    expect(res.body.data.generated).toBe(false);
    expect(res.body.data.assignments).toHaveLength(0);
  });
});

describe("GET /history", () => {
  it("returns all assignments and fairness summary", async () => {
    await seedHousehold();
    await request(app).post("/assign/week").send({ weekStart: "2026-10-19" });
    const res = await request(app).get("/history");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.assignments)).toBe(true);
    expect(res.body.data.assignments.length).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(res.body.data.fairness)).toBe(true);
  });
});

describe("GET /weeks", () => {
  it("returns an empty array when no weeks have been generated", async () => {
    const res = await request(app).get("/weeks");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("lists weeks after generation", async () => {
    await seedHousehold();
    await request(app).post("/assign/week").send({ weekStart: "2026-10-19" });
    const res = await request(app).get("/weeks");
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].week_start).toBe("2026-10-19");
  });
});

describe("roommate validation", () => {
  it("rejects names longer than 80 characters", async () => {
    const res = await request(app)
      .post("/roommates")
      .send({ name: "A".repeat(81) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_NAME");
  });

  it("rejects an empty patch body", async () => {
    const created = await request(app).post("/roommates").send({ name: "Sam" });
    const id = created.body.data.id;
    const res = await request(app).patch(`/roommates/${id}`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("EMPTY_PATCH");
  });

  it("rejects an invalid UUID in PATCH", async () => {
    const res = await request(app).patch("/roommates/not-a-uuid").send({ name: "X" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_ID");
  });
});

describe("chore validation", () => {
  it("rejects difficulty 0", async () => {
    const res = await request(app).post("/chores").send({ name: "Floors", difficulty: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_DIFFICULTY");
  });

  it("rejects fractional difficulty", async () => {
    const res = await request(app).post("/chores").send({ name: "Floors", difficulty: 2.5 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_DIFFICULTY");
  });

  it("rejects an empty chore name", async () => {
    const res = await request(app).post("/chores").send({ name: "", difficulty: 2 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_NAME");
  });
});

describe("404 handler", () => {
  it("returns JSON 404 for unknown routes", async () => {
    const res = await request(app).get("/no-such-route");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

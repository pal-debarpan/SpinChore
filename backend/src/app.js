import express from "express";
import cors from "cors";
import { roommateRoutes } from "./routes/roommates.js";
import { choreRoutes } from "./routes/chores.js";
import { assignmentRoutes } from "./routes/assignments.js";
import { errorHandler, notFoundHandler } from "./http/errorHandler.js";
import { createRoommateService } from "./services/roommateService.js";
import { createChoreService } from "./services/choreService.js";
import { createAssignmentService } from "./services/assignmentService.js";

export function createApp({ db, corsOrigin, rngFactory } = {}) {
  const app = express();
  const roommates = createRoommateService(db);
  const chores = createChoreService(db);
  const assignments = createAssignmentService(db, { rngFactory });

  app.use(cors({ origin: corsOrigin || true }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => {
    res.json({
      data: { ok: true, service: "spinchore-api" },
      error: null,
    });
  });

  app.use("/roommates", roommateRoutes(roommates));
  app.use("/chores", choreRoutes(chores, assignments));
  app.use(assignmentRoutes(assignments));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

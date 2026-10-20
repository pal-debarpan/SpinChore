import { Router } from "express";
import { asyncHandler } from "../http/asyncHandler.js";
import { requireUuid } from "../http/validate.js";

export function assignmentRoutes(assignments) {
  const router = Router();

  router.get(
    "/week/current",
    asyncHandler(async (_req, res) => {
      const data = await assignments.getWeekMeta();
      res.json({ data, error: null });
    })
  );

  router.get(
    "/weeks",
    asyncHandler(async (_req, res) => {
      const data = await assignments.listWeeks();
      res.json({ data, error: null });
    })
  );

  router.get(
    "/dashboard",
    asyncHandler(async (req, res) => {
      const data = await assignments.dashboard(req.query.week);
      res.json({ data, error: null });
    })
  );

  router.post(
    "/assign/week",
    asyncHandler(async (req, res) => {
      const data = await assignments.generateWeek({
        weekStart: req.body?.weekStart,
        force: Boolean(req.body?.force),
      });
      res.status(data.generated ? 201 : 200).json({ data, error: null });
    })
  );

  router.post(
    "/assign/next-week",
    asyncHandler(async (req, res) => {
      const data = await assignments.startNextWeek({
        fromWeekStart: req.body?.fromWeekStart,
      });
      res.status(data.generated ? 201 : 200).json({ data, error: null });
    })
  );

  router.get(
    "/assignments/current",
    asyncHandler(async (req, res) => {
      const data = await assignments.getAssignmentsForWeek(req.query.week);
      res.json({ data, error: null });
    })
  );

  router.get(
    "/assignments/:week",
    asyncHandler(async (req, res) => {
      const data = await assignments.getAssignmentsForWeek(req.params.week);
      res.json({ data, error: null });
    })
  );

  router.get(
    "/history",
    asyncHandler(async (_req, res) => {
      const data = await assignments.allHistory();
      res.json({ data, error: null });
    })
  );

  router.get(
    "/history/:roommateId",
    asyncHandler(async (req, res) => {
      const data = await assignments.historyForRoommate(requireUuid(req.params.roommateId, "roommateId"));
      res.json({ data, error: null });
    })
  );

  return router;
}

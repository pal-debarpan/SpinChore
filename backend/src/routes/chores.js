import { Router } from "express";
import { asyncHandler } from "../http/asyncHandler.js";
import { parseBoolean, requireUuid } from "../http/validate.js";

export function choreRoutes(chores, assignments) {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const data = await chores.list({
        active: parseBoolean(req.query.active),
        difficulty: req.query.difficulty,
      });
      res.json({ data, error: null });
    })
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const data = await chores.create(req.body || {});
      res.status(201).json({ data, error: null });
    })
  );

  router.patch(
    "/:id",
    asyncHandler(async (req, res) => {
      const data = await chores.update(requireUuid(req.params.id), req.body || {});
      res.json({ data, error: null });
    })
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      const data = await chores.deactivate(requireUuid(req.params.id));
      res.json({ data, error: null });
    })
  );

  router.post(
    "/:id/complete",
    asyncHandler(async (req, res) => {
      const data = await assignments.completeChore(requireUuid(req.params.id), {
        weekStart: req.body?.weekStart || req.query.week,
      });
      res.json({ data, error: null });
    })
  );

  return router;
}

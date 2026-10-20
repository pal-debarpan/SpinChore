import { Router } from "express";
import { asyncHandler } from "../http/asyncHandler.js";
import { parseBoolean, requireUuid } from "../http/validate.js";

export function roommateRoutes(roommates) {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const data = await roommates.list({ active: parseBoolean(req.query.active) });
      res.json({ data, error: null });
    })
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const data = await roommates.create(req.body || {});
      res.status(201).json({ data, error: null });
    })
  );

  router.patch(
    "/:id",
    asyncHandler(async (req, res) => {
      const data = await roommates.update(requireUuid(req.params.id), req.body || {});
      res.json({ data, error: null });
    })
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      const data = await roommates.deactivate(requireUuid(req.params.id));
      res.json({ data, error: null });
    })
  );

  return router;
}

import { badRequest, notFound } from "../http/errors.js";
import { throwIfDbError } from "../db/errors.js";

function cleanName(name) {
  if (typeof name !== "string" || name.trim().length === 0) {
    throw badRequest("Name is required", "INVALID_NAME");
  }
  if (name.trim().length > 80) {
    throw badRequest("Name must be 80 characters or fewer", "INVALID_NAME");
  }
  return name.trim();
}

export function createRoommateService(db) {
  return {
    async list({ active } = {}) {
      let query = db.from("roommates").select("*").order("created_at", { ascending: true });
      if (active === true) query = query.eq("is_active", true);
      if (active === false) query = query.eq("is_active", false);
      const { data, error } = await query;
      throwIfDbError(error);
      return data ?? [];
    },

    async get(id) {
      const { data, error } = await db.from("roommates").select("*").eq("id", id).maybeSingle();
      throwIfDbError(error);
      if (!data) throw notFound("Roommate");
      return data;
    },

    async create({ name }) {
      const { data, error } = await db
        .from("roommates")
        .insert({ name: cleanName(name), is_active: true })
        .select("*")
        .single();
      throwIfDbError(error);
      return data;
    },

    async update(id, patch) {
      await this.get(id);
      const updates = {};
      if (patch.name !== undefined) updates.name = cleanName(patch.name);
      if (patch.isActive !== undefined) {
        if (typeof patch.isActive !== "boolean") {
          throw badRequest("isActive must be a boolean", "INVALID_STATUS");
        }
        updates.is_active = patch.isActive;
      }
      if (Object.keys(updates).length === 0) {
        throw badRequest("No valid fields to update", "EMPTY_PATCH");
      }
      const { data, error } = await db
        .from("roommates")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();
      throwIfDbError(error);
      return data;
    },

    async deactivate(id) {
      return this.update(id, { isActive: false });
    },
  };
}

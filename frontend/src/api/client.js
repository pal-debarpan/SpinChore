const baseUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(payload?.error?.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.code = payload?.error?.code;
    throw error;
  }

  return payload?.data;
}

export const api = {
  health: () => request("/health"),
  dashboard: (week) => request(`/dashboard${week ? `?week=${week}` : ""}`),
  weekMeta: () => request("/week/current"),
  weeks: () => request("/weeks"),
  listRoommates: (active) =>
    request(`/roommates${active === undefined ? "" : `?active=${active}`}`),
  createRoommate: (body) => request("/roommates", { method: "POST", body: JSON.stringify(body) }),
  updateRoommate: (id, body) =>
    request(`/roommates/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deactivateRoommate: (id) => request(`/roommates/${id}`, { method: "DELETE" }),
  listChores: (params = {}) => {
    const query = new URLSearchParams();
    if (params.active !== undefined) query.set("active", params.active);
    if (params.difficulty) query.set("difficulty", params.difficulty);
    const suffix = query.toString() ? `?${query}` : "";
    return request(`/chores${suffix}`);
  },
  createChore: (body) => request("/chores", { method: "POST", body: JSON.stringify(body) }),
  updateChore: (id, body) => request(`/chores/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deactivateChore: (id) => request(`/chores/${id}`, { method: "DELETE" }),
  generateWeek: (body) => request("/assign/week", { method: "POST", body: JSON.stringify(body || {}) }),
  startNextWeek: (fromWeekStart) =>
    request("/assign/next-week", {
      method: "POST",
      body: JSON.stringify(fromWeekStart ? { fromWeekStart } : {}),
    }),
  currentAssignments: () => request("/assignments/current"),
  assignmentsForWeek: (week) => request(`/assignments/${week}`),
  completeChore: (id, weekStart) =>
    request(`/chores/${id}/complete`, { method: "POST", body: JSON.stringify({ weekStart }) }),
  history: () => request("/history"),
  roommateHistory: (id) => request(`/history/${id}`),
};

export { baseUrl };

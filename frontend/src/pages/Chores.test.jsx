import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Chores } from "./Chores.jsx";
import { ToastProvider } from "../components/Toast.jsx";

vi.mock("../api/client.js", () => ({
  api: {
    listChores: vi.fn(),
    createChore: vi.fn(),
    updateChore: vi.fn(),
    deactivateChore: vi.fn(),
  },
}));

import { api } from "../api/client.js";

function renderPage() {
  return render(
    <ToastProvider>
      <Chores />
    </ToastProvider>
  );
}

const sampleChore = {
  id: "aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa",
  name: "Kitchen",
  description: "Wipe counters",
  difficulty: 3,
  is_active: true,
  created_at: "2026-10-19T00:00:00.000Z",
};

describe("Chores page", () => {
  beforeEach(() => {
    api.listChores.mockResolvedValue([]);
    api.createChore.mockResolvedValue({ ...sampleChore });
    api.updateChore.mockResolvedValue({ ...sampleChore });
  });

  it("shows an empty state when there are no chores", async () => {
    renderPage();
    expect(await screen.findByText("No chores match")).toBeInTheDocument();
  });

  it("validates that name is required when adding a chore", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("No chores match");
    await user.click(screen.getByRole("button", { name: "Add chore" }));
    // Clear the name field (it defaults empty) and submit
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(api.createChore).not.toHaveBeenCalled();
  });

  it("shows chore list and difficulty badge when chores are loaded", async () => {
    api.listChores.mockResolvedValue([sampleChore]);
    renderPage();
    expect(await screen.findByText("Kitchen")).toBeInTheDocument();
    // Difficulty badge: "3 · Medium"
    const badges = await screen.findAllByText(/3 · Medium/);
    expect(badges.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Active").length).toBeGreaterThanOrEqual(1);
  });

  it("filters chores by active status", async () => {
    const inactiveChore = { ...sampleChore, id: "bbbbbbbb-0000-4000-8000-bbbbbbbbbbbb", name: "Retired", is_active: false };
    api.listChores.mockResolvedValue([sampleChore, inactiveChore]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Kitchen");
    await screen.findByText("Retired");
    // Filter to active only
    const statusFilter = screen.getByDisplayValue("All statuses");
    await user.selectOptions(statusFilter, "active");
    expect(screen.getByText("Kitchen")).toBeInTheDocument();
    expect(screen.queryByText("Retired")).not.toBeInTheDocument();
  });

  it("opens the edit modal when Edit is clicked", async () => {
    api.listChores.mockResolvedValue([sampleChore]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Kitchen");
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(await screen.findByText("Edit chore")).toBeInTheDocument();
  });
});

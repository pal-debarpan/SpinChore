import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { History } from "./History.jsx";

vi.mock("../api/client.js", () => ({
  api: {
    history: vi.fn(),
    listRoommates: vi.fn(),
    weeks: vi.fn(),
  },
}));

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

import { api } from "../api/client.js";

const sampleHistory = {
  assignments: [
    {
      id: "a1",
      weekStart: "2026-10-19",
      roommateId: "r1",
      roommateName: "Avery",
      choreId: "c1",
      choreName: "Dishes",
      difficulty: 2,
      isCompleted: true,
      completedAt: "2026-10-20T10:00:00Z",
    },
    {
      id: "a2",
      weekStart: "2026-10-19",
      roommateId: "r2",
      roommateName: "Jordan",
      choreId: "c2",
      choreName: "Trash",
      difficulty: 1,
      isCompleted: false,
      completedAt: null,
    },
  ],
  fairness: [
    { roommateId: "r1", name: "Avery", difficulty: 2 },
    { roommateId: "r2", name: "Jordan", difficulty: 1 },
  ],
};

const sampleRoommates = [
  { id: "r1", name: "Avery", is_active: true },
  { id: "r2", name: "Jordan", is_active: true },
];

const sampleWeeks = [
  { weekStart: "2026-10-19", weekEnd: "2026-10-25", count: 2 },
];

describe("History page", () => {
  beforeEach(() => {
    api.history.mockResolvedValue(sampleHistory);
    api.listRoommates.mockResolvedValue(sampleRoommates);
    api.weeks.mockResolvedValue(sampleWeeks);
  });

  it("renders history table and difficulty section", async () => {
    render(<History />);
    expect(await screen.findByText("History")).toBeInTheDocument();
    expect(screen.getByText("Cumulative difficulty")).toBeInTheDocument();
    expect(screen.getByText("Dishes")).toBeInTheDocument();
    expect(screen.getByText("Trash")).toBeInTheDocument();
  });

  it("filters table when roommate is selected", async () => {
    const user = userEvent.setup();
    render(<History />);
    await screen.findByText("Dishes");

    const roommateSelect = screen.getByDisplayValue("All roommates");
    await user.selectOptions(roommateSelect, "r1");

    expect(screen.getByText("Dishes")).toBeInTheDocument();
    expect(screen.queryByText("Trash")).not.toBeInTheDocument();
  });

  it("shows error state when API call fails", async () => {
    api.history.mockRejectedValue(new Error("Database disconnected"));
    render(<History />);
    expect(await screen.findByText("History unavailable")).toBeInTheDocument();
  });
});

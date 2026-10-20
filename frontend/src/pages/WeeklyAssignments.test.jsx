import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WeeklyAssignments } from "./WeeklyAssignments.jsx";
import { ToastProvider } from "../components/Toast.jsx";

vi.mock("../api/client.js", () => ({
  api: {
    currentAssignments: vi.fn(),
    assignmentsForWeek: vi.fn(),
    weeks: vi.fn(),
    listRoommates: vi.fn(),
    generateWeek: vi.fn(),
    completeChore: vi.fn(),
    startNextWeek: vi.fn(),
  },
}));

import { api } from "../api/client.js";

const WEEK_START = "2026-10-19";

const emptyWeek = {
  weekStart: WEEK_START,
  weekEnd: "2026-10-25",
  label: "Oct 19 – Oct 25, 2026 (UTC)",
  generated: false,
  assignments: [],
};

const populatedWeek = {
  ...emptyWeek,
  generated: true,
  assignments: [
    {
      id: "a1",
      weekStart: WEEK_START,
      roommateId: "r1",
      roommateName: "Avery",
      choreId: "c1",
      choreName: "Kitchen",
      choreDescription: "Wipe counters",
      difficulty: 3,
      isCompleted: false,
      completedAt: null,
    },
    {
      id: "a2",
      weekStart: WEEK_START,
      roommateId: "r2",
      roommateName: "Jordan",
      choreId: "c2",
      choreName: "Bath",
      choreDescription: null,
      difficulty: 5,
      isCompleted: false,
      completedAt: null,
    },
  ],
};

function renderPage() {
  return render(
    <ToastProvider>
      <WeeklyAssignments />
    </ToastProvider>
  );
}

describe("WeeklyAssignments page", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/");
    api.currentAssignments.mockResolvedValue(emptyWeek);
    api.assignmentsForWeek.mockImplementation(() => api.currentAssignments());
    api.weeks.mockResolvedValue([]);
    api.listRoommates.mockResolvedValue([
      { id: "r1", name: "Avery", is_active: true },
      { id: "r2", name: "Jordan", is_active: true },
    ]);
    api.generateWeek.mockResolvedValue({ ...populatedWeek, reused: false });
    api.completeChore.mockResolvedValue({});
  });

  it("renders the empty state when no assignments exist", async () => {
    renderPage();
    expect(await screen.findByText("Nothing assigned yet")).toBeInTheDocument();
  });

  it("shows the Generate button", async () => {
    renderPage();
    expect(
      await screen.findByRole("button", { name: /Generate this week/i })
    ).toBeInTheDocument();
  });

  it("displays assignments after generation", async () => {
    renderPage();
    const user = userEvent.setup();
    const btn = await screen.findByRole("button", { name: /Generate this week/i });
    await user.click(btn);
    expect(await screen.findByText("Kitchen")).toBeInTheDocument();
    expect(await screen.findByText("Bath")).toBeInTheDocument();
    expect(screen.getAllByText("Avery").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Jordan").length).toBeGreaterThanOrEqual(1);
  });

  it("shows assignment cards when week is already generated on load", async () => {
    api.currentAssignments.mockResolvedValue(populatedWeek);
    renderPage();
    expect(await screen.findByText("Kitchen")).toBeInTheDocument();
    expect(await screen.findByText("Bath")).toBeInTheDocument();
  });

  it("shows an error message if generate fails", async () => {
    api.generateWeek.mockRejectedValue(new Error("Need at least one include active roommate"));
    const user = userEvent.setup();
    renderPage();
    const btn = await screen.findByRole("button", { name: /Generate this week/i });
    await user.click(btn);
    const errorElements = await screen.findAllByText(/Need at least one include active roommate/i);
    expect(errorElements.length).toBeGreaterThanOrEqual(1);
  });

  it("does not display duplicate names on the wheel when a roommate has multiple chores", async () => {
    const multiChoreWeek = {
      ...populatedWeek,
      assignments: [
        {
          id: "a1",
          weekStart: WEEK_START,
          roommateId: "r1",
          roommateName: "Avery",
          choreId: "c1",
          choreName: "Kitchen",
          difficulty: 3,
          isCompleted: false,
        },
        {
          id: "a2",
          weekStart: WEEK_START,
          roommateId: "r1",
          roommateName: "Avery",
          choreId: "c2",
          choreName: "Dishes",
          difficulty: 2,
          isCompleted: false,
        },
        {
          id: "a3",
          weekStart: WEEK_START,
          roommateId: "r2",
          roommateName: "Jordan",
          choreId: "c3",
          choreName: "Bath",
          difficulty: 5,
          isCompleted: false,
        },
      ],
    };

    api.currentAssignments.mockResolvedValue(multiChoreWeek);
    api.listRoommates.mockResolvedValue([
      { id: "r1", name: "Avery", is_active: true },
      { id: "r2", name: "Jordan", is_active: true },
    ]);

    const { container } = renderPage();
    expect(await screen.findByText("Kitchen")).toBeInTheDocument();
    expect(await screen.findByText("Dishes")).toBeInTheDocument();
    expect(await screen.findByText("Bath")).toBeInTheDocument();

    // Wheel slices use text-[11px] font-semibold text-white
    const wheelLabels = container.querySelectorAll(".origin-left");
    const labelTexts = Array.from(wheelLabels).map((el) => el.textContent.trim());
    // Each eligible roommate should appear exactly once on the wheel
    expect(labelTexts).toEqual(["Avery", "Jordan"]);
  });

  it("includes newly added roommate on the wheel after generation", async () => {
    renderPage();
    const user = userEvent.setup();

    // Generation returns new assignments with Taylor
    api.generateWeek.mockResolvedValue({
      ...populatedWeek,
      assignments: [
        ...populatedWeek.assignments,
        {
          id: "a3",
          weekStart: WEEK_START,
          roommateId: "r3",
          roommateName: "Taylor",
          choreId: "c3",
          choreName: "Trash",
          difficulty: 1,
          isCompleted: false,
        },
      ],
      reused: false,
    });
    // Roommates list now includes newly added roommate Taylor
    api.listRoommates.mockResolvedValue([
      { id: "r1", name: "Avery", is_active: true },
      { id: "r2", name: "Jordan", is_active: true },
      { id: "r3", name: "Taylor", is_active: true },
    ]);

    const btn = await screen.findByRole("button", { name: /Generate this week/i });
    await user.click(btn);

    expect(await screen.findByText("Trash")).toBeInTheDocument();
    expect(screen.getAllByText("Taylor").length).toBeGreaterThanOrEqual(1);
  });

  it("shows a completion banner when all assignments are marked complete", async () => {
    const completedWeek = {
      ...populatedWeek,
      assignments: populatedWeek.assignments.map((a) => ({
        ...a,
        isCompleted: true,
        completedAt: "2026-10-20T10:00:00.000Z",
      })),
    };
    api.currentAssignments.mockResolvedValue(completedWeek);
    renderPage();
    expect(
      await screen.findByText(/All chores for this week are done/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Start Next Week/i })
    ).toBeInTheDocument();
  });

  it("calls startNextWeek and renders the new week after clicking Start Next Week", async () => {
    const NEXT_WEEK_START = "2026-10-26";
    const completedWeek = {
      ...populatedWeek,
      assignments: populatedWeek.assignments.map((a) => ({
        ...a,
        isCompleted: true,
        completedAt: "2026-10-20T10:00:00.000Z",
      })),
    };
    api.currentAssignments.mockResolvedValue(completedWeek);

    const nextWeekResult = {
      weekStart: NEXT_WEEK_START,
      weekEnd: "2026-11-01",
      label: "Oct 26 – Nov 1, 2026 (UTC)",
      generated: true,
      reused: false,
      assignments: [
        {
          id: "b1",
          weekStart: NEXT_WEEK_START,
          roommateId: "r1",
          roommateName: "Avery",
          choreId: "c1",
          choreName: "Kitchen",
          difficulty: 3,
          isCompleted: false,
          completedAt: null,
        },
        {
          id: "b2",
          weekStart: NEXT_WEEK_START,
          roommateId: "r2",
          roommateName: "Jordan",
          choreId: "c2",
          choreName: "Bath",
          difficulty: 5,
          isCompleted: false,
          completedAt: null,
        },
      ],
    };
    api.startNextWeek.mockResolvedValue(nextWeekResult);

    const user = userEvent.setup();
    renderPage();

    const btn = await screen.findByRole("button", { name: /Start Next Week/i });
    await user.click(btn);

    // After clicking, api.startNextWeek should have been called with the current weekStart
    expect(api.startNextWeek).toHaveBeenCalledWith(WEEK_START);

    // New week's assignments should be visible
    expect(await screen.findByText(/Oct 26/)).toBeInTheDocument();
    // Completion banner should disappear since new week has incomplete chores
    expect(screen.queryByText(/All chores for this week are done/i)).not.toBeInTheDocument();
  });

  it("reloads and displays the newly started week instead of reverting after browser refresh", async () => {
    const NEXT_WEEK_START = "2026-10-26";
    const completedWeek = {
      ...populatedWeek,
      assignments: populatedWeek.assignments.map((a) => ({
        ...a,
        isCompleted: true,
        completedAt: "2026-10-20T10:00:00.000Z",
      })),
    };
    const nextWeekResult = {
      weekStart: NEXT_WEEK_START,
      weekEnd: "2026-11-01",
      label: "Oct 26 – Nov 1, 2026 (UTC)",
      generated: true,
      reused: false,
      assignments: [
        {
          id: "b1",
          weekStart: NEXT_WEEK_START,
          roommateId: "r1",
          roommateName: "Avery",
          choreId: "c1",
          choreName: "Kitchen",
          difficulty: 3,
          isCompleted: false,
          completedAt: null,
        },
      ],
    };

    api.currentAssignments.mockResolvedValue(completedWeek);
    api.startNextWeek.mockResolvedValue(nextWeekResult);
    api.assignmentsForWeek.mockImplementation((w) => {
      if (w === NEXT_WEEK_START) return Promise.resolve(nextWeekResult);
      return Promise.resolve(completedWeek);
    });

    const user = userEvent.setup();
    const { unmount } = renderPage();

    // 1. Click Start Next Week
    const btn = await screen.findByRole("button", { name: /Start Next Week/i });
    await user.click(btn);
    expect(await screen.findByText(/Oct 26/)).toBeInTheDocument();

    // 2. Simulate browser refresh / page reload:
    // The previous component unmounts, and a fresh instance mounts with the persisted URL/state
    unmount();
    renderPage();

    // 3. Confirm the new week is reloaded from persisted state and NOT reverted to completed week
    expect(await screen.findByText(/Oct 26/)).toBeInTheDocument();
    expect(screen.queryByText(/All chores for this week are done/i)).not.toBeInTheDocument();
  });

  it("triggers spin from the center SPIN button and displays winner highlight", async () => {
    renderPage();
    const user = userEvent.setup();

    const spinBtn = await screen.findByRole("button", { name: /Spin wheel/i });
    expect(spinBtn).toBeInTheDocument();
    expect(spinBtn).toHaveTextContent("SPIN");

    await user.click(spinBtn);
    expect(api.generateWeek).toHaveBeenCalled();

    expect(await screen.findByText(/Wheel Selected/i)).toBeInTheDocument();
    expect(screen.getByText(/Chore: Kitchen/i)).toBeInTheDocument();
  });
});

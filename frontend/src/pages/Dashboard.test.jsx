import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "./Dashboard.jsx";
import { ToastProvider } from "../components/Toast.jsx";

vi.mock("../api/client.js", () => ({
  api: {
    dashboard: vi.fn(),
    completeChore: vi.fn(),
  },
}));

// ResizeObserver mock for Recharts ResponsiveContainer in jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

import { api } from "../api/client.js";

const sampleDashboardData = {
  week: {
    weekStart: "2026-10-19",
    weekEnd: "2026-10-25",
    label: "Oct 19 – Oct 25, 2026 (UTC)",
    generated: true,
    assignments: [
      {
        id: "a1",
        weekStart: "2026-10-19",
        roommateId: "r1",
        roommateName: "Avery",
        choreId: "c1",
        choreName: "Dishes",
        choreDescription: "Unload dishwasher",
        difficulty: 2,
        isCompleted: false,
        completedAt: null,
      },
    ],
  },
  stats: {
    activeRoommates: 3,
    activeChores: 5,
    completedThisWeek: 0,
    completionPercent: 0,
  },
  fairness: [
    { roommateId: "r1", name: "Avery", difficulty: 4, hardCount: 1 },
    { roommateId: "r2", name: "Jordan", difficulty: 5, hardCount: 1 },
  ],
};

function renderPage() {
  return render(
    <BrowserRouter>
      <ToastProvider>
        <Dashboard />
      </ToastProvider>
    </BrowserRouter>
  );
}

describe("Dashboard page", () => {
  beforeEach(() => {
    api.dashboard.mockResolvedValue(sampleDashboardData);
  });

  it("renders statistics and assignment cards", async () => {
    renderPage();
    expect(await screen.findByText("Oct 19 – Oct 25, 2026 (UTC)")).toBeInTheDocument();
    expect(screen.getByText("Active roommates")).toBeInTheDocument();
    expect(screen.getByText("Active chores")).toBeInTheDocument();
    expect(screen.getAllByText("Dishes").length).toBeGreaterThanOrEqual(1);
  });

  it("shows empty state when no assignments exist yet", async () => {
    api.dashboard.mockResolvedValue({
      ...sampleDashboardData,
      week: {
        ...sampleDashboardData.week,
        generated: false,
        assignments: [],
      },
    });
    renderPage();
    expect(await screen.findByText("No spin yet this week")).toBeInTheDocument();
  });

  it("shows error state when API call fails", async () => {
    api.dashboard.mockRejectedValue(new Error("Network failed"));
    renderPage();
    expect(await screen.findByText("Can't reach the API")).toBeInTheDocument();
  });
});

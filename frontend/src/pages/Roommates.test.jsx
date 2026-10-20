import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Roommates } from "./Roommates.jsx";
import { ToastProvider } from "../components/Toast.jsx";

vi.mock("../api/client.js", () => ({
  api: {
    listRoommates: vi.fn(),
    createRoommate: vi.fn(),
    updateRoommate: vi.fn(),
    deactivateRoommate: vi.fn(),
  },
}));

import { api } from "../api/client.js";

function renderPage() {
  return render(
    <ToastProvider>
      <Roommates />
    </ToastProvider>
  );
}

describe("Roommates page", () => {
  beforeEach(() => {
    api.listRoommates.mockResolvedValue([]);
  });

  it("shows an empty state and validates the add form", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText("No roommates yet")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add roommate" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(api.createRoommate).not.toHaveBeenCalled();
  });
});

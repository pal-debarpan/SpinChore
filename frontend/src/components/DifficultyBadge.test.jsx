import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DifficultyBadge } from "./DifficultyBadge.jsx";

describe("DifficultyBadge", () => {
  it("renders the numeric rating and label", () => {
    render(<DifficultyBadge value={5} />);
    expect(screen.getByText("5 · Hard")).toBeInTheDocument();
  });
});

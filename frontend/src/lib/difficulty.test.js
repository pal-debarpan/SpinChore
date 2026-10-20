import { describe, expect, it } from "vitest";
import { DIFFICULTY_LABELS, difficultyClass } from "./difficulty.js";

describe("difficulty helpers", () => {
  it("labels 1–5 from easy to hard", () => {
    expect(DIFFICULTY_LABELS[1]).toBe("Easy");
    expect(DIFFICULTY_LABELS[5]).toBe("Hard");
  });

  it("uses distinct classes for easy and hard", () => {
    expect(difficultyClass(1)).not.toBe(difficultyClass(5));
  });
});

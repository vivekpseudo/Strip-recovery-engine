import { describe, expect, it } from "vitest";
import { decideRetry } from "../src/lib/retry-policy.js";

describe("decideRetry", () => {
  it("does not retry hard declines", () => {
    expect(decideRetry("lost_card", 0).retry).toBe(false);
  });
  it("stops after retry limit", () => {
    expect(decideRetry("insufficient_funds", 3).retry).toBe(false);
  });
  it("schedules a conservative retry for unknown soft declines", () => {
    expect(decideRetry("insufficient_funds", 0)).toMatchObject({ retry: true, delayHours: 24 });
  });
});

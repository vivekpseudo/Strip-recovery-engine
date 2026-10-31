import { describe, expect, it } from "vitest";
import { classifyDecline } from "../src/lib/decline-classifier.js";
describe("classifyDecline", () => {
  it("routes authentication_required to customer action", () => expect(classifyDecline({ code: "authentication_required" }).category).toBe("customer_action"));
  it("allows temporary decline to follow Stripe retry policy", () => expect(classifyDecline({ code: "insufficient_funds" }).retryable).toBe(true));
  it("blocks hard declines", () => expect(classifyDecline({ code: "lost_card" }).retryable).toBe(false));
  it("routes fraud signals to risk review", () => expect(classifyDecline({ code: "fraudulent" }).category).toBe("fraud_risk"));
  it("does not assume unknown codes are retryable", () => expect(classifyDecline({ code: "issuer_custom_code" }).category).toBe("unknown"));
});

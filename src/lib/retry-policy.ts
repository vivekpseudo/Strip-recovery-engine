export type RetryDecision = { retry: boolean; delayHours?: number; reason: string };

// Conservative starter policy. Stripe's own retry configuration and network guidance
// should take precedence; hard declines must not be retried automatically.
const HARD_DECLINES = new Set(["authentication_required", "do_not_honor", "lost_card", "stolen_card", "pickup_card", "restricted_card", "invalid_account"]);

export function decideRetry(code: string | null | undefined, attemptCount: number): RetryDecision {
  const normalized = (code ?? "").trim().toLowerCase();
  if (HARD_DECLINES.has(normalized) || normalized.startsWith("fraudulent")) {
    return { retry: false, reason: "hard_decline_or_risk_signal" };
  }
  if (attemptCount >= 3) return { retry: false, reason: "retry_limit_reached" };
  const delays = [24, 72, 120];
  return { retry: true, delayHours: delays[Math.min(attemptCount, delays.length - 1)], reason: "soft_or_unknown_decline" };
}

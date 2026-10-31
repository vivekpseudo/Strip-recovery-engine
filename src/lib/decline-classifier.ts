export type DeclineCategory = "customer_action" | "temporary" | "hard_decline" | "fraud_risk" | "unknown";
export type DeclineInput = { code?: string | null; declineCode?: string | null; outcomeType?: string | null; networkAdviceCode?: string | null; paymentMethodType?: string | null };
export type DeclineClassification = { category: DeclineCategory; retryable: boolean; customerActionRequired: boolean; reason: string; sourceCode: string | null };

const HARD = new Set(["invalid_account", "lost_card", "stolen_card", "pickup_card", "restricted_card", "invalid_number", "revocation_of_authorization", "account_closed"]);
const TEMPORARY = new Set(["insufficient_funds", "issuer_not_available", "processing_error", "try_again_later", "temporary_hold", "reenter_transaction"]);
const ACTION = new Set(["authentication_required", "authenticate", "authentication_not_handled"]);
const FRAUD = new Set(["fraudulent", "suspected_fraud", "merchant_blacklist"]);

export function classifyDecline(input: DeclineInput): DeclineClassification {
  const code = (input.declineCode ?? input.code ?? input.networkAdviceCode ?? "").trim().toLowerCase() || null;
  const outcome = (input.outcomeType ?? "").trim().toLowerCase();
  if (code && (FRAUD.has(code) || outcome.includes("fraud"))) return { category: "fraud_risk", retryable: false, customerActionRequired: false, reason: "fraud_or_risk_signal", sourceCode: code };
  if (code && ACTION.has(code)) return { category: "customer_action", retryable: false, customerActionRequired: true, reason: "authentication_or_customer_action_required", sourceCode: code };
  if (code && HARD.has(code)) return { category: "hard_decline", retryable: false, customerActionRequired: true, reason: "hard_decline_payment_method_update_required", sourceCode: code };
  if (code && TEMPORARY.has(code)) return { category: "temporary", retryable: true, customerActionRequired: false, reason: "temporary_decline_follow_stripe_retry_policy", sourceCode: code };
  return { category: "unknown", retryable: false, customerActionRequired: false, reason: "unknown_decline_requires_review", sourceCode: code };
}

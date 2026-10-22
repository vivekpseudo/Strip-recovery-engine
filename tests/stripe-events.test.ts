import { describe, expect, it, vi } from "vitest";
import { processStripeEvent } from "../src/lib/stripe-events.js";
import type Stripe from "stripe";

function event(type: string, invoiceOverrides: Record<string, unknown> = {}) {
  return {
    id: "evt_test_123",
    type,
    data: { object: { id: "in_test_123", customer: "cus_test_123", amount_due: 2500, amount_paid: 2500, currency: "usd", status: "open", attempt_count: 1, ...invoiceOverrides } }
  } as unknown as Stripe.Event;
}

function mockClient(tenantRows: unknown[] = [{ tenant_id: "tenant-1" }]) {
  const query = vi.fn(async (sql: string) => {
    if (sql.includes("SELECT tenant_id FROM customers")) return { rows: tenantRows, rowCount: tenantRows.length };
    if (sql.includes("SELECT id FROM invoices")) return { rows: [{ id: "invoice-1" }], rowCount: 1 };
    return { rows: [], rowCount: 1 };
  });
  return { query } as never;
}

describe("processStripeEvent", () => {
  it("does not infer tenant when Stripe customer is not connected", async () => {
    const client = mockClient([]);
    await processStripeEvent(client, event("invoice.payment_failed"));
    expect((client as any).query).toHaveBeenCalledWith(
      expect.stringContaining("processing_error"),
      ["evt_test_123", "customer_not_connected_to_tenant"]
    );
  });

  it("upserts invoice and schedules a recovery job after payment failure", async () => {
    const client = mockClient();
    await processStripeEvent(client, event("invoice.payment_failed"));
    expect((client as any).query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO invoices"),
      expect.any(Array)
    );
    expect((client as any).query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO recovery_jobs"),
      expect.any(Array)
    );
  });

  it("cancels pending recovery jobs after payment succeeds", async () => {
    const client = mockClient();
    await processStripeEvent(client, event("invoice.paid", { status: "paid" }));
    expect((client as any).query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE recovery_jobs SET status='cancelled'"),
      ["tenant-1", "invoice-1"]
    );
  });
});

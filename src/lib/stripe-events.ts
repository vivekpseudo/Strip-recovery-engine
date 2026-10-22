import type Stripe from "stripe";
import type { PoolClient } from "pg";

/**
 * Applies the supported Stripe invoice lifecycle events to the local recovery model.
 * Tenant ownership is resolved from the already-connected Stripe customer mapping;
 * an event never gets to choose an arbitrary tenant without that mapping.
 */
export async function processStripeEvent(client: PoolClient, event: Stripe.Event): Promise<void> {
  const object = event.data.object as Stripe.Invoice;
  if (!("customer" in object) || !object.customer) return;

  const stripeCustomerId = typeof object.customer === "string" ? object.customer : object.customer.id;
  const customer = await client.query(
    "SELECT tenant_id FROM customers WHERE stripe_customer_id=$1 LIMIT 1",
    [stripeCustomerId]
  );
  if (!customer.rowCount) {
    // Keep the event durable and visible for operator reconciliation. Do not guess tenant ownership.
    await client.query(
      "UPDATE stripe_events SET processing_error=$2 WHERE id=$1",
      [event.id, "customer_not_connected_to_tenant"]
    );
    return;
  }
  const tenantId = customer.rows[0].tenant_id as string;
  await client.query("UPDATE stripe_events SET tenant_id=$2 WHERE id=$1", [event.id, tenantId]);

  if (event.type === "invoice.payment_failed" || event.type === "invoice.payment_succeeded" || event.type === "invoice.paid") {
    const invoice = object;
    const invoiceId = invoice.id;
    const amountDue = Number(invoice.amount_due ?? 0);
    const currency = invoice.currency ?? "usd";
    const status = invoice.status ?? (event.type === "invoice.payment_failed" ? "open" : "paid");
    const attemptCount = Number(invoice.attempt_count ?? 0);
    const failureCode = event.type === "invoice.payment_failed"
      ? ((invoice.last_finalization_error as { code?: string } | null)?.code ?? null)
      : null;

    await client.query(`
      INSERT INTO invoices
        (tenant_id, stripe_invoice_id, stripe_customer_id, amount_due, currency, status, attempt_count, last_failure_code, recovered_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())
      ON CONFLICT (tenant_id, stripe_invoice_id) DO UPDATE SET
        amount_due=EXCLUDED.amount_due,
        currency=EXCLUDED.currency,
        status=EXCLUDED.status,
        attempt_count=GREATEST(invoices.attempt_count, EXCLUDED.attempt_count),
        last_failure_code=EXCLUDED.last_failure_code,
        recovered_at=COALESCE(EXCLUDED.recovered_at, invoices.recovered_at),
        updated_at=now()
    `, [
      tenantId, invoiceId, stripeCustomerId, amountDue, currency, status, attemptCount,
      failureCode, (event.type === "invoice.payment_succeeded" || event.type === "invoice.paid") ? new Date() : null
    ]);

    const localInvoice = await client.query(
      "SELECT id FROM invoices WHERE tenant_id=$1 AND stripe_invoice_id=$2",
      [tenantId, invoiceId]
    );
    const localInvoiceId = localInvoice.rows[0].id as string;

    if (event.type === "invoice.payment_failed") {
      // Stripe's own Smart Retries should remain authoritative when enabled. This job
      // schedules a controlled follow-up only; worker validates status before payment.
      const delays = [24, 72, 120];
      const delayHours = delays[Math.min(Math.max(attemptCount - 1, 0), delays.length - 1)];
      await client.query(`
        INSERT INTO recovery_jobs (tenant_id, invoice_id, job_type, run_at)
        SELECT $1,$2,'retry',now() + ($3::text || ' hours')::interval
        WHERE NOT EXISTS (
          SELECT 1 FROM recovery_jobs
          WHERE tenant_id=$1 AND invoice_id=$2 AND job_type='retry' AND status IN ('pending','processing')
        )
      `, [tenantId, localInvoiceId, delayHours]);
      await client.query(
        "INSERT INTO recovery_logs (tenant_id, invoice_id, event_type, details) VALUES ($1,$2,'payment_failed',$3::jsonb)",
        [tenantId, localInvoiceId, JSON.stringify({ stripeEventId: event.id, attemptCount, failureCode })]
      );
    } else {
      await client.query(
        "UPDATE recovery_jobs SET status='cancelled', updated_at=now() WHERE tenant_id=$1 AND invoice_id=$2 AND status IN ('pending','processing')",
        [tenantId, localInvoiceId]
      );
      await client.query(
        "INSERT INTO recovery_logs (tenant_id, invoice_id, event_type, details) VALUES ($1,$2,'payment_recovered',$3::jsonb)",
        [tenantId, localInvoiceId, JSON.stringify({ stripeEventId: event.id, amountPaid: Number(invoice.amount_paid ?? 0), currency })]
      );
    }
  }
}

import "dotenv/config";
import { pool } from "./lib/db.js";

// Durable queue dispatcher. Stripe Billing Smart Retries remain authoritative for
// charging; this worker reconciles due jobs and records an auditable hand-off.
async function tick() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const due = await client.query(`
      SELECT j.id, j.tenant_id, j.invoice_id, i.stripe_invoice_id, i.status AS invoice_status
      FROM recovery_jobs j
      JOIN invoices i ON i.id=j.invoice_id AND i.tenant_id=j.tenant_id
      WHERE j.status='pending' AND j.run_at <= now()
      ORDER BY j.run_at
      FOR UPDATE OF j SKIP LOCKED
      LIMIT 25
    `);
    for (const job of due.rows) {
      if (!["open", "past_due"].includes(job.invoice_status)) {
        await client.query("UPDATE recovery_jobs SET status='cancelled', updated_at=now() WHERE id=$1", [job.id]);
        continue;
      }
      await client.query("UPDATE recovery_jobs SET status='completed', updated_at=now() WHERE id=$1", [job.id]);
      await client.query(
        "INSERT INTO recovery_logs (tenant_id, invoice_id, event_type, details) VALUES ($1,$2,'retry_deferred_to_stripe_billing',$3::jsonb)",
        [job.tenant_id, job.invoice_id, JSON.stringify({ stripeInvoiceId: job.stripe_invoice_id, reason: "stripe_billing_owns_retry_schedule" })]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("worker_tick_failed", error instanceof Error ? error.message : "unknown");
  } finally {
    client.release();
  }
}

let running = false;
const interval = setInterval(() => {
  if (running) return;
  running = true;
  void tick().finally(() => { running = false; });
}, 10_000);
void tick();
process.on("SIGTERM", async () => { clearInterval(interval); await pool.end(); process.exit(0); });

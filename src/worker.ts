import "dotenv/config";
import { pool } from "./lib/db.js";
import { decideRetry } from "./lib/retry-policy.js";

// Run continuously as a separate process. This starter schedules eligible retries;
// production should enqueue Stripe API calls via a durable queue with leases and
// per-tenant rate limits. Never retry hard declines or bypass Stripe's retry settings.
async function tick() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const jobs = await client.query(`
      SELECT id, tenant_id, invoice_id, attempts
      FROM recovery_jobs
      WHERE status = 'pending' AND run_at <= now()
      ORDER BY run_at
      FOR UPDATE SKIP LOCKED
      LIMIT 25
    `);
    for (const job of jobs.rows) {
      await client.query(
        "UPDATE recovery_jobs SET status='processing', attempts=attempts+1, updated_at=now() WHERE id=$1",
        [job.id]
      );
      const invoice = await client.query(
        "SELECT last_failure_code, attempt_count FROM invoices WHERE id=$1 AND tenant_id=$2",
        [job.invoice_id, job.tenant_id]
      );
      if (!invoice.rowCount) {
        await client.query("UPDATE recovery_jobs SET status='failed', last_error='invoice_not_found', updated_at=now() WHERE id=$1", [job.id]);
        continue;
      }
      const decision = decideRetry(invoice.rows[0].last_failure_code, Number(invoice.rows[0].attempt_count));
      if (!decision.retry) {
        await client.query("UPDATE recovery_jobs SET status='cancelled', last_error=$2, updated_at=now() WHERE id=$1", [job.id, decision.reason]);
        await client.query("INSERT INTO recovery_logs (tenant_id, invoice_id, event_type, details) VALUES ($1,$2,'retry_skipped',$3::jsonb)", [job.tenant_id, job.invoice_id, JSON.stringify({ reason: decision.reason })]);
        continue;
      }
      // Deliberately do not issue a charge here. Implement Stripe invoice/payment
      // retry through Stripe's supported billing configuration after integration tests.
      await client.query("UPDATE recovery_jobs SET status='failed', last_error='stripe_retry_adapter_not_configured', updated_at=now() WHERE id=$1", [job.id]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("worker_tick_failed", error instanceof Error ? error.message : "unknown");
  } finally {
    client.release();
  }
}

const interval = setInterval(() => void tick(), 15_000);
void tick();
process.on("SIGTERM", async () => { clearInterval(interval); await pool.end(); process.exit(0); });

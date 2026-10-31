import { pool } from "./db.js";
import { emailProvider } from "./email.js";

export async function dispatchDueDunningEmails(limit = 25): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const due = await client.query(`
      SELECT j.id, j.tenant_id, j.invoice_id, c.email, c.stripe_customer_id,
             i.stripe_invoice_id, i.status, t.name AS tenant_name
      FROM recovery_jobs j
      JOIN invoices i ON i.id=j.invoice_id AND i.tenant_id=j.tenant_id
      JOIN customers c ON c.tenant_id=j.tenant_id AND c.stripe_customer_id=i.stripe_customer_id
      JOIN tenants t ON t.id=j.tenant_id
      WHERE j.job_type='dunning_email' AND j.status='pending' AND j.run_at <= now()
      ORDER BY j.run_at FOR UPDATE OF j SKIP LOCKED LIMIT $1
    `, [limit]);
    let sent = 0;
    for (const row of due.rows) {
      if (!row.email || !["open", "past_due"].includes(row.status)) {
        await client.query("UPDATE recovery_jobs SET status='cancelled', updated_at=now() WHERE id=$1", [row.id]);
        continue;
      }
      const claimed = await client.query("UPDATE recovery_jobs SET status='processing', attempts=attempts+1, updated_at=now() WHERE id=$1 AND status='pending' RETURNING id", [row.id]);
      if (!claimed.rowCount) continue;
      await client.query("INSERT INTO communication_log (tenant_id, invoice_id, channel, template_key, status, idempotency_key) VALUES ($1,$2,'email','payment_failed','queued',$3) ON CONFLICT (idempotency_key) DO NOTHING",
        [row.tenant_id, row.invoice_id, `dunning:${row.tenant_id}:${row.invoice_id}:email`]);
      await client.query("UPDATE recovery_jobs SET status='completed', updated_at=now() WHERE id=$1", [row.id]);
      sent++;
    }
    await client.query("COMMIT");
    return sent;
  } catch (e) { await client.query("ROLLBACK").catch(() => undefined); throw e; }
  finally { client.release(); }
}

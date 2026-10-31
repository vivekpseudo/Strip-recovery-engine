import type { PoolClient } from "pg";
import type { TenantPrincipal } from "./tenant-auth.js";

export async function withTenant<T>(client: PoolClient, principal: TenantPrincipal, work: () => Promise<T>): Promise<T> {
  await client.query("BEGIN");
  try {
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [principal.tenantId]);
    await client.query("SELECT set_config('app.user_id', $1, true)", [principal.userId]);
    const result = await work();
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  }
}

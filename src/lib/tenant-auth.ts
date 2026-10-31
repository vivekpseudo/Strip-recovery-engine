import type { Request, Response, NextFunction } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "./config.js";

export type TenantRole = "owner" | "admin" | "operator" | "analyst";
export type TenantPrincipal = { userId: string; tenantId: string; role: TenantRole };
declare global { namespace Express { interface Request { principal?: TenantPrincipal } } }

function verifyToken(token: string): TenantPrincipal | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const input = parts.slice(0, 2).join(".");
  const expected = createHmac("sha256", config.JWT_SECRET).update(input).digest("base64url");
  const a = Buffer.from(parts[2]); const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Record<string, unknown>;
    if (typeof payload.sub !== "string" || typeof payload.tenant_id !== "string" || typeof payload.role !== "string") return null;
    if (typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    if (!["owner", "admin", "operator", "analyst"].includes(payload.role)) return null;
    return { userId: payload.sub, tenantId: payload.tenant_id, role: payload.role as TenantRole };
  } catch { return null; }
}

export function requireTenantAuth(req: Request, res: Response, next: NextFunction) {
  const value = req.header("authorization") ?? "";
  const principal = value.startsWith("Bearer ") ? verifyToken(value.slice(7)) : null;
  if (!principal) { res.status(401).json({ error: "unauthorized" }); return; }
  req.principal = principal;
  next();
}

const grants: Record<TenantRole, string[]> = {
  owner: ["*"],
  admin: ["dashboard:read", "customers:read", "customers:write", "recovery:read", "recovery:write", "settings:write", "members:write"],
  operator: ["dashboard:read", "customers:read", "recovery:read", "recovery:write"],
  analyst: ["dashboard:read", "customers:read", "recovery:read"]
};
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.principal?.role;
    if (!role || (!grants[role].includes("*") && !grants[role].includes(permission))) { res.status(403).json({ error: "forbidden" }); return; }
    next();
  };
}

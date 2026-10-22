import type { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "node:crypto";
import { config } from "./config.js";

export function requireApiToken(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization") ?? "";
  const supplied = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(supplied);
  const b = Buffer.from(config.APP_API_TOKEN);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}

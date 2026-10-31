import "dotenv/config";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
 const dir=path.dirname(fileURLToPath(import.meta.url));
 await pool.query(await readFile(path.join(dir,"schema.sql"),"utf8"));
 await pool.query(await readFile(path.join(dir,"rls.sql"),"utf8"));
 console.log("Database schema and tenant RLS policies applied.");
} finally { await pool.end(); }

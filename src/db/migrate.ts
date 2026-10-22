import "dotenv/config";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const schemaPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "schema.sql");
  const sql = await readFile(schemaPath, "utf8");
  await pool.query(sql);
  console.log("Database schema applied.");
} finally {
  await pool.end();
}

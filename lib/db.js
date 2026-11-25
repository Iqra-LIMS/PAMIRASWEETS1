import { Pool } from "pg";
import { SCHEMA } from "./schema.js";

const g = globalThis;
function make() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set. Add it to .env.local (see README).");
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
}
// lazy, so `next build` works without a database
export const pool = {
  query: (...a) => (g.__pamiraPool ??= make()).query(...a),
  connect: () => (g.__pamiraPool ??= make()).connect(),
};
// creates the tables the first time they are needed
export function ready() {
  return (g.__pamiraReady ??= pool.query(SCHEMA).catch((e) => { g.__pamiraReady = null; throw e; }));
}

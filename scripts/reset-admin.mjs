// Forgot the admin password? Run:  npm run reset-admin
// It removes the admin account so you can create a new one at /admin (you will get a new setup code in the server log).
import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Fill in .env.local and run this from the project folder: npm run reset-admin");
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined });
try {
  const r = await pool.query("delete from settings where key in ('admin', 'admin_setup')");
  console.log(r.rowCount ? "The admin account was removed." : "There was no admin account to remove.");
  console.log("Now open http://localhost:3000/admin and create a new one.");
} catch (e) {
  console.error("Could not reach the database:", e.code || e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}

import { NextResponse } from "next/server";
import { db } from "../../../lib/db.js";

export const dynamic = "force-dynamic";

// Open http://localhost:3000/api/health to see whether the database connection works.
export async function GET() {
  try {
    await db.query("select 1");
    return NextResponse.json({ ok: true, database: "connected" });
  } catch (e) {
    const code = e.code || e.message || "unknown";
    return NextResponse.json({
      ok: false, database: "not reachable", code,
      hint: code === "ECONNREFUSED"
        ? "Nothing is answering at the address in DATABASE_URL. Start PostgreSQL, or use a hosted database (Neon or Supabase) and paste its connection string into DATABASE_URL."
        : "Check DATABASE_URL in .env.local, then restart npm run dev.",
    }, { status: 503 });
  }
}

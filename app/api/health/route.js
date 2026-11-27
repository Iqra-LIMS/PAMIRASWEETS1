import { NextResponse } from "next/server";
import * as dbmod from "../../../lib/db.js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const exported = Object.keys(dbmod);
    const q = dbmod.query || dbmod.db?.query || dbmod.default?.query || dbmod.pool?.query;
    if (!q) {
      return NextResponse.json({
        ok: false,
        hint: "lib/db.js doesn't export a query function under a known name.",
        exports: exported,
      }, { status: 500 });
    }
    await q.call(dbmod.pool || dbmod.db || dbmod.default || dbmod, "select 1");
    return NextResponse.json({ ok: true, database: "connected" });
  } catch (e) {
    const code = e.code || e.message || "unknown";
    return NextResponse.json({
      ok: false, database: "not reachable", code,
      hint: "Check DATABASE_URL in .env.local, then restart npm run dev.",
    }, { status: 503 });
  }
}
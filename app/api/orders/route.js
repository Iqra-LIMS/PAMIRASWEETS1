import { NextResponse } from "next/server";
import { validateOrder } from "../../../lib/validate";
import { saveOrder, verifyOrder } from "../../../lib/orders";
import { notify } from "../../../lib/notify";
import { getPrices } from "../../../lib/pricestore";

const hits = new Map(); // simple per-IP rate limit (resets on restart)

export async function POST(req) {
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60000);
  if (recent.length >= 5) return NextResponse.json({ error: "Too many orders. Please wait a minute." }, { status: 429 });
  hits.set(ip, [...recent, now]);

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const P = await getPrices(); // current prices from the database
  const v = validateOrder(body, P);
  if (v.honeypot) return NextResponse.json({ ok: true, id: "PAM-0000", total: 0 });
  if (!v.ok) return NextResponse.json({ errors: v.errors }, { status: 422 });

  // CHECK 1, before saving: the total the customer was shown must match the server's price.
  if (v.expectedTotal !== null && v.expectedTotal !== v.data.total) {
    const d = v.data;
    return NextResponse.json({
      error: "price_changed",
      quote: { ok: true, city: d.customer.city, items: d.items.map(({ name, detail, unit, qty }) => ({ name, detail, unit, qty })), subtotal: d.subtotal, delivery: d.delivery, total: d.total, eta: d.eta },
    }, { status: 409 });
  }

  try {
    const saved = await saveOrder(v.data, v.expectedTotal);
    // CHECK 2, after saving: read it back from PostgreSQL and re-price it independently.
    const check = await verifyOrder(saved.id, P);
    if (!check.ok) console.error("PRICE MISMATCH after saving", saved.id, JSON.stringify(check));
    await notify({ ...saved, priceVerified: check.ok }).catch((e) => console.error("Email failed:", e.message));
    return NextResponse.json({ ok: true, id: saved.id, total: saved.total, delivery: saved.delivery, eta: saved.eta, verified: check.ok });
  } catch (e) {
    console.error("Could not save the order:", e.code || e.message || "database unreachable");
    return NextResponse.json({ error: "Could not save the order" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { priceCart } from "../../../lib/quote";
import { getPrices } from "../../../lib/pricestore";

const hits = new Map();

// BEFORE placing: the browser asks the server what the cart really costs.
export async function POST(req) {
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60000);
  if (recent.length >= 60) return NextResponse.json({ ok: false }, { status: 429 });
  hits.set(ip, [...recent, now]);

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const city = typeof body.city === "string" ? body.city.trim().slice(0, 60) : "";
  const cart = priceCart(body.items, city, await getPrices());
  if (!cart.ok) return NextResponse.json({ ok: false }, { status: 422 });
  return NextResponse.json({
    ok: true, city: city || null,
    items: cart.items.map(({ name, detail, unit, qty }) => ({ name, detail, unit, qty })),
    subtotal: cart.subtotal, delivery: cart.delivery, total: cart.total, eta: cart.eta,
  });
}

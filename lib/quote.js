// Prices a whole cart on the server. Used for the live quote (before ordering) and when the order is placed.
import { priceItem } from "./pricing.js";
import { deliveryFee, etaFor } from "./delivery.js";

export function priceCart(rawItems, city, P) {
  const raw = Array.isArray(rawItems) ? rawItems.slice(0, 50) : [];
  const items = raw.map((x) => {
    const p = priceItem(x && x.spec, P);
    const qty = Math.round(Number(x && x.qty));
    return p && qty >= 1 && qty <= 99 ? { ...p, qty } : null;
  });
  if (!items.length || items.some((x) => !x)) return { ok: false };
  const subtotal = items.reduce((s, x) => s + x.unit * x.qty, 0);
  const delivery = city ? deliveryFee(city, subtotal, P) : null;
  return { ok: true, items, subtotal, delivery, total: subtotal + (delivery || 0), eta: city ? etaFor(city) : null };
}

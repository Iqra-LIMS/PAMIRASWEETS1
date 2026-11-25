import { priceCart } from "./quote.js";

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function validateOrder(b, P) {
  const c = (b && b.customer) || {};
  if (str(c.website, 50)) return { honeypot: true }; // hidden field: only bots fill it
  const errors = {};
  const name = str(c.name, 80);
  if (name.length < 2) errors.name = "Please enter your full name";
  const m = str(c.phone, 20).replace(/[\s\-()]/g, "").match(/^(?:\+?92|0)?(3\d{9})$/);
  if (!m) errors.phone = "Enter a valid mobile number, e.g. 0342 1513871";
  const phone = m ? "0" + m[1] : "";
  const email = str(c.email, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = "Enter a valid email address";
  const city = str(c.city, 60);
  if (city.length < 2) errors.city = "Please enter your city";
  const address = str(c.address, 300);
  if (address.length < 10) errors.address = "Please enter your full delivery address";

  // prices are always re-calculated here; any price sent by the browser is ignored
  const cart = priceCart(b && b.items, city, P);
  if (!cart.ok) errors.items = "Your cart is empty or has an item that is no longer available. Please refresh and try again.";
  if (Object.keys(errors).length) return { ok: false, errors };

  const seen = Number(b && b.expectedTotal);
  return {
    ok: true,
    expectedTotal: Number.isFinite(seen) && seen > 0 ? Math.round(seen) : null, // the total the customer was shown
    data: {
      customer: { name, phone, email, city, address, notes: str(c.notes, 500) },
      items: cart.items, card: str(b.card, 300),
      subtotal: cart.subtotal, delivery: cart.delivery, total: cart.total, eta: cart.eta,
      payment: "Cash on delivery",
    },
  };
}

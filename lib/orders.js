// Order storage in PostgreSQL.
import { pool, ready } from "./db.js";
import { priceItem } from "./pricing.js";
import { deliveryFee } from "./delivery.js";

export const STATUSES = ["new", "confirmed", "out for delivery", "delivered", "cancelled"];

const shape = (r, items) => ({
  id: r.order_no,
  createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  status: r.status,
  customer: { name: r.name, phone: r.phone, email: r.email, city: r.city, address: r.address, notes: r.notes },
  card: r.card, subtotal: r.subtotal, delivery: r.delivery, total: r.total, payment: r.payment,
  eta: r.eta_range ? { range: r.eta_range, days: r.eta_days } : null,
  quotedTotal: r.quoted_total, priceVerified: r.price_verified,
  items: items.map((i) => ({ name: i.name, detail: i.detail, unit: i.unit, qty: i.qty, spec: i.spec })),
});

export async function getOrder(orderNo) {
  await ready();
  const r = await pool.query("select * from orders where order_no = $1", [orderNo]);
  if (!r.rows[0]) return null;
  const it = await pool.query("select * from order_items where order_id = $1 order by id", [r.rows[0].id]);
  return shape(r.rows[0], it.rows);
}

// saves the order and its items together (all or nothing)
export async function saveOrder(o, quotedTotal = null) {
  await ready();
  const c = await pool.connect();
  try {
    await c.query("begin");
    const r = await c.query(
      `insert into orders (order_no, name, phone, email, city, address, notes, card, subtotal, delivery, total, eta_range, eta_days, payment, quoted_total)
       values ('PAM-' || nextval('order_no_seq')::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       returning id, order_no`,
      [o.customer.name, o.customer.phone, o.customer.email, o.customer.city, o.customer.address, o.customer.notes, o.card, o.subtotal, o.delivery, o.total, o.eta && o.eta.range, o.eta && o.eta.days, o.payment, quotedTotal]
    );
    const { id, order_no } = r.rows[0];
    for (const it of o.items) {
      await c.query("insert into order_items (order_id, name, detail, unit, qty, spec) values ($1, $2, $3, $4, $5, $6)", [id, it.name, it.detail, it.unit, it.qty, JSON.stringify(it.spec)]);
    }
    await c.query("commit");
    return await getOrder(order_no);
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

// AFTER placing: read the order back from the database, re-price every line from its saved choices,
// and check the stored totals (and the total the customer was shown) all agree.
export async function verifyOrder(orderNo, P) {
  const o = await getOrder(orderNo);
  if (!o) return { ok: false, reason: "order not found" };
  let subtotal = 0, ok = true;
  for (const i of o.items) {
    const p = priceItem(i.spec, P);
    if (!p || p.unit !== i.unit) ok = false;
    subtotal += (p ? p.unit : 0) * i.qty;
  }
  const delivery = deliveryFee(o.customer.city, subtotal, P);
  const total = subtotal + delivery;
  if (subtotal !== o.subtotal || delivery !== o.delivery || total !== o.total) ok = false;
  if (o.quotedTotal !== null && o.quotedTotal !== o.total) ok = false;
  await pool.query("update orders set price_verified = $2, verified_at = now() where order_no = $1", [orderNo, ok]);
  return { ok, expected: { subtotal, delivery, total }, stored: { subtotal: o.subtotal, delivery: o.delivery, total: o.total }, quoted: o.quotedTotal };
}

export async function listOrders() {
  await ready();
  const r = await pool.query("select * from orders order by created_at desc, id desc");
  if (!r.rows.length) return [];
  const it = await pool.query("select * from order_items where order_id = any($1::int[]) order by id", [r.rows.map((x) => x.id)]);
  const by = new Map();
  for (const i of it.rows) (by.get(i.order_id) || by.set(i.order_id, []).get(i.order_id)).push(i);
  return r.rows.map((x) => shape(x, by.get(x.id) || []));
}

export async function setStatus(id, status) {
  if (!STATUSES.includes(status)) return;
  await ready();
  await pool.query("update orders set status = $2 where order_no = $1", [id, status]);
}

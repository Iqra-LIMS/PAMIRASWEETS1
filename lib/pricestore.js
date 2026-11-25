// Server only: reads and saves the price book in PostgreSQL.
import { pool, ready } from "./db.js";
import { DEFAULT_PRICES, mergePrices } from "./prices.js";

let cache = { at: 0, p: null };

export async function getPrices(fresh = false) {
  if (!fresh && cache.p && Date.now() - cache.at < 15000) return cache.p; // cached for 15 seconds
  try {
    await ready();
    const r = await pool.query("select value from settings where key = 'prices'");
    cache = { at: Date.now(), p: mergePrices(r.rows[0] && r.rows[0].value) };
    return cache.p;
  } catch (e) {
    console.error("Cannot reach PostgreSQL (is it running, and is DATABASE_URL right?). Showing default prices. Reason:", e.code || e.message || "connection refused");
    return cache.p || DEFAULT_PRICES;
  }
}

export async function setPrices(values) {
  await ready();
  await pool.query("insert into settings (key, value) values ('prices', $1) on conflict (key) do update set value = excluded.value, updated_at = now()", [JSON.stringify(values)]);
  cache = { at: Date.now(), p: mergePrices(values) };
}

export async function resetPrices() {
  await ready();
  await pool.query("delete from settings where key = 'prices'");
  cache = { at: Date.now(), p: mergePrices(null) };
}

export async function pricesUpdatedAt() {
  await ready();
  const r = await pool.query("select updated_at from settings where key = 'prices'");
  return r.rows[0] ? r.rows[0].updated_at : null;
}

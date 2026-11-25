import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPrices, setPrices, resetPrices, pricesUpdatedAt } from "../../../lib/pricestore.js";
import { groups, parsePricesForm } from "../../../lib/prices";
import { priceItem } from "../../../lib/pricing";
import { requireAdmin } from "../../../lib/auth.js";
import { logout } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "PAMIRA prices", robots: "noindex" };
const money = (n) => "Rs. " + n.toLocaleString("en-US");

async function save(formData) {
  "use server";
  await requireAdmin();
  const r = parsePricesForm(formData);
  if (!r.ok) redirect(`/admin/prices?err=${encodeURIComponent(r.error)}`);
  try { await setPrices(r.values); } catch (e) { redirect(`/admin/prices?err=${encodeURIComponent("Could not save: " + (e.code || e.message))}`); }
  revalidatePath("/", "layout");
  redirect(`/admin/prices?msg=${encodeURIComponent("Prices saved. They apply to new orders straight away.")}`);
}

async function reset() {
  "use server";
  await requireAdmin();
  try { await resetPrices(); } catch (e) { redirect(`/admin/prices?err=${encodeURIComponent("Could not reset: " + (e.code || e.message))}`); }
  revalidatePath("/", "layout");
  redirect(`/admin/prices?msg=${encodeURIComponent("Prices were reset to the original defaults.")}`);
}

export default async function Prices({ searchParams }) {
  await requireAdmin();
  let P, updated;
  try { P = await getPrices(true); updated = await pricesUpdatedAt(); } catch (e) {
    return <main className="ad"><p className="pr-err" role="alert">Cannot reach the database ({e.code || e.message || "unknown error"}). Check that PostgreSQL is running and that DATABASE_URL in .env.local is correct, then restart npm run dev. Open /api/health for details.</p></main>;
  }
  const msg = searchParams?.msg ? String(searchParams.msg) : "";
  const err = searchParams?.err ? String(searchParams.err) : "";
  const samples = [
    ["Pistachio Heart, Medjool, box of 6", { type: "ready", id: "r2", kind: "medjool" }],
    ["Almond & Orange Classic, Ajwa, box of 6", { type: "ready", id: "r1", kind: "ajwa" }],
    ["Custom: 12 Medjool hearts, dark chocolate", { type: "custom", kinds: ["medjool"], shapes: ["heart"], fills: ["pistachio"], coats: ["dark"], choc: false, pieces: 12 }],
    ["Custom box of 12, dates and chocolates, milk", { type: "box", size: 12, mix: "mix", kinds: ["medjool"], dShapes: ["classic"], cShapes: ["heart"], coats: ["milk"] }],
  ];

  return (
    <main className="ad">
      <header className="ad-bar">
        <h1>Prices</h1>
        <span className="ad-links"><Link href="/admin" className="link">← Orders</Link> <Link href="/admin/account" className="link">Account</Link> <form action={logout}><button className="link">Log out</button></form></span>
      </header>
      <p className="small">Change any price below and press Save. New prices apply to new orders straight away. Orders already placed keep the price they were placed at.{updated && ` Last saved ${new Date(updated).toLocaleString("en-GB", { timeZone: "Asia/Karachi" })}.`}</p>
      {msg && <p className="ad-msg" role="status">{msg}</p>}
      {err && <p className="pr-err" role="alert">{err}</p>}

      <section className="pr-samples">
        <h2>Examples at current prices</h2>
        <ul>{samples.map(([label, spec]) => <li key={label}><span>{label}</span><b>{money(priceItem(spec, P).unit)}</b></li>)}</ul>
      </section>

      <form action={save} className="pr-form">
        {groups(P).map((g) => (
          <fieldset key={g.title} className="pr-group">
            <legend>{g.title}</legend>
            {g.note && <p className="small">{g.note}</p>}
            <div className="pr-grid">
              {g.fields.map((f) => (
                <label key={f.name}>
                  <span>{f.label}</span>
                  <span className="pr-in">Rs. <input type="number" name={f.name} defaultValue={f.value} min={f.min} step="1" required inputMode="numeric" /></span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <div className="pr-actions"><button className="btn gold">Save prices</button></div>
      </form>

      <form action={reset} className="pr-reset">
        <details>
          <summary>Reset all prices to the original defaults</summary>
          <p>This replaces every price above with the defaults that came with the website.</p>
          <button className="btn danger">Yes, reset all prices</button>
        </details>
      </form>
    </main>
  );
}

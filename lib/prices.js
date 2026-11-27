// The "price book": every price the shop owner may change. Defaults come from lib/menu.js, lib/pricing.js and lib/delivery.js;
// the admin Prices page saves overrides in PostgreSQL (table: settings).
import { KINDS, SHAPES, COATS, HAMPERS, FLOWER_PIECE, FLOWER_PRICES } from "./menu.js";
import { BOX_FEE } from "./pricing.js";
import { ZONES, OTHER_FEE, FREE_OVER } from "./delivery.js";

const fromList = (list, key) => Object.fromEntries(list.map((x) => [x.id, x[key]]));

export const DEFAULT_PRICES = {
  kinds: fromList(KINDS, "price"),
  shapes: fromList(SHAPES, "extra"),
  coats: fromList(COATS, "extra"),
  chocBase: 90,
  flowerPiece: FLOWER_PIECE,
  flower: Object.fromEntries(Object.entries(FLOWER_PRICES).map(([n, v]) => [String(n), v])),
  boxFee: BOX_FEE,
  hampers: fromList(HAMPERS, "price"),
  delivery: { zones: Object.fromEntries(ZONES.map((z) => [z.city, z.fee])), other: OTHER_FEE, freeOver: FREE_OVER },
};

const MAX = 1000000;
const whole = (v, min) => Number.isInteger(v) && v >= min && v <= MAX;

// the form groups shown on the admin Prices page (also used to validate what is saved)
export function groups(P = DEFAULT_PRICES) {
  const f = (list, group, min, suffix = "") => list.map((x) => ({ name: `${group}.${x.id}`, label: x.name + suffix, min, value: P[group][x.id], path: [group, x.id] }));
  return [
    { title: "Dates", note: "Price per piece, before shape and chocolate.", fields: f(KINDS, "kinds", 1) },
    { title: "Shapes", note: "Extra added per piece.", fields: f(SHAPES, "shapes", 0) },
    { title: "Chocolate coating", note: "Extra added per piece.", fields: f(COATS, "coats", 0) },
    { title: "Flower dates", note: "Flower dates sold on their own come in 2, 4, 6 or 8 pieces, with one set price for each quantity. It replaces the date kind, shape and coating prices.", fields: [
      ...[2, 4, 6, 8].map((n) => ({ name: `flower.${n}`, label: `${n} flower dates`, min: 1, value: P.flower[String(n)], path: ["flower", String(n)] })),
      { name: "flowerPiece", label: "Flower date mixed with other shapes or in a custom box (per piece)", min: 1, value: P.flowerPiece, path: ["flowerPiece"] },
    ] },
    { title: "Chocolates and boxes", note: "", fields: [
      { name: "chocBase", label: "Chocolate-only piece (per piece)", min: 1, value: P.chocBase, path: ["chocBase"] },
      { name: "boxFee", label: "Custom box fee (added to every custom box)", min: 0, value: P.boxFee, path: ["boxFee"] },
    ] },
    { title: "Gift hampers", note: "Fixed price for the whole hamper.", fields: HAMPERS.map((h) => ({ name: `hampers.${h.id}`, label: `${h.name} (${h.size})`, min: 1, value: P.hampers[h.id], path: ["hampers", h.id] })) },
    { title: "Delivery", note: "Fee per city. Free delivery applies when the subtotal reaches the limit (0 means never free).", fields: [
      ...ZONES.map((z) => ({ name: `zones.${z.city}`, label: z.city, min: 0, value: P.delivery.zones[z.city], path: ["delivery", "zones", z.city] })),
      { name: "otherFee", label: "Any other city", min: 0, value: P.delivery.other, path: ["delivery", "other"] },
      { name: "freeOver", label: "Free delivery from subtotal of", min: 0, value: P.delivery.freeOver, path: ["delivery", "freeOver"] },
    ] },
  ];
}
const FIELDS = groups().flatMap((g) => g.fields);

// merges saved overrides into the defaults, ignoring anything unknown or invalid
export function mergePrices(o) {
  const P = JSON.parse(JSON.stringify(DEFAULT_PRICES));
  if (!o || typeof o !== "object") return P;
  for (const f of FIELDS) {
    let v = o;
    for (const k of f.path) v = v && typeof v === "object" ? v[k] : undefined;
    if (whole(v, f.min)) { let t = P; f.path.slice(0, -1).forEach((k) => (t = t[k])); t[f.path[f.path.length - 1]] = v; }
  }
  return P;
}

const rule = (f) => `"${f.label}" needs a whole number${f.min ? ` of at least ${f.min}` : ""} (no decimals or letters).`;
// checks a complete nested price object; returns { ok } or { ok: false, error }
export function validatePrices(values) {
  for (const f of FIELDS) {
    let v = values;
    for (const k of f.path) v = v && typeof v === "object" ? v[k] : undefined;
    if (!whole(v, f.min)) return { ok: false, error: rule(f) };
  }
  return { ok: true };
}

// reads the admin form; returns { ok, values } or { ok: false, error }
export function parsePricesForm(fd) {
  const out = {};
  for (const f of FIELDS) {
    const raw = String(fd.get(f.name) ?? "").trim();
    const v = Number(raw);
    if (raw === "" || !whole(v, f.min)) return { ok: false, error: rule(f) };
    let t = out; f.path.slice(0, -1).forEach((k) => (t = t[k] = t[k] || {})); t[f.path[f.path.length - 1]] = v;
  }
  return { ok: true, values: out };
}

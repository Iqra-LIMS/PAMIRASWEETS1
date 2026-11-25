// Server only: the admin account lives in PostgreSQL (table `settings`, key "admin"). The password is stored as a salted scrypt hash.
import { scrypt, randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { pool, ready } from "./db.js";

export const validUsername = (u) => typeof u === "string" && /^[a-z0-9._-]{3,32}$/i.test(u);
// returns a problem name, or null when the password is acceptable
export function passwordProblem(pw, username) {
  if (typeof pw !== "string" || pw.length < 10) return "short";
  if (pw.length > 100) return "long";
  if (pw.toLowerCase() === String(username).toLowerCase()) return "same";
  return null;
}

const kdf = (pw, salt) => new Promise((res, rej) => scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 }, (e, k) => (e ? rej(e) : res(k))));
export async function hashPassword(pw) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("base64")}$${(await kdf(pw, salt)).toString("base64")}`;
}
export async function checkPassword(pw, stored) {
  const [alg, s, k] = String(stored || "").split("$");
  if (alg !== "scrypt" || !s || !k) return false;
  const want = Buffer.from(k, "base64");
  const got = await kdf(String(pw), Buffer.from(s, "base64"));
  return got.length === want.length && timingSafeEqual(got, want);
}
export const newSecret = () => randomBytes(32).toString("base64url");
const sha = (s) => createHash("sha256").update(String(s)).digest();
const eq = (a, b) => timingSafeEqual(sha(a), sha(b));

async function read(key) {
  await ready();
  const r = await pool.query("select value from settings where key = $1", [key]);
  return r.rows[0] ? r.rows[0].value : null;
}

// { username, hash, secret, updatedAt } or null when no admin exists yet
export const getAdmin = () => read("admin");

// creates the first admin; returns { secret } or null if one already exists
export async function createAdmin(username, password) {
  await ready();
  const rec = { username, hash: await hashPassword(password), secret: newSecret(), updatedAt: new Date().toISOString() };
  const r = await pool.query("insert into settings (key, value) values ($1, $2) on conflict (key) do nothing returning key", ["admin", JSON.stringify(rec)]);
  return r.rows.length ? rec : null;
}

// changes username, password hash and/or session secret
export async function saveAdmin(patch) {
  const old = await getAdmin();
  const rec = { ...old, ...patch, updatedAt: new Date().toISOString() };
  await pool.query("update settings set value = $2, updated_at = now() where key = $1", ["admin", JSON.stringify(rec)]);
  return rec;
}

// one-time code shown in the server log, so only the person who runs the server can create the first admin
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export async function ensureSetupCode() {
  let v = await read("admin_setup");
  if (!v) {
    const code = Array.from(randomBytes(8), (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
    await pool.query("insert into settings (key, value) values ($1, $2) on conflict (key) do nothing returning key", ["admin_setup", JSON.stringify({ code })]);
    v = await read("admin_setup");
  }
  return v.code;
}
export async function checkSetupCode(given) {
  const v = await read("admin_setup");
  return !!v && eq(String(given || "").trim().toUpperCase(), v.code);
}
export async function clearSetupCode() {
  await pool.query("delete from settings where key = $1", ["admin_setup"]);
}

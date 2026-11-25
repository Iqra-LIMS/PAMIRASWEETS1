// Signed, expiring admin session cookie (Web Crypto only). The signing secret is stored with the admin account in the database.
export const COOKIE = "pamira_admin";
export const MAX_AGE = 60 * 60 * 24 * 7; // stay signed in for 7 days

const enc = new TextEncoder();
const toB64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64 = (s) => atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4));

async function sign(data, secret) {
  const key = await crypto.subtle.importKey("raw", enc.encode(String(secret)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toB64(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}
const same = (a, b) => { // constant-time comparison
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

export async function createSession(user, secret, now = Date.now()) {
  const payload = toB64(enc.encode(JSON.stringify({ u: user, exp: now + MAX_AGE * 1000 })));
  return `${payload}.${await sign(payload, secret)}`;
}

export async function readSession(token, secret, now = Date.now()) {
  if (!secret || !token || typeof token !== "string") return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !same(sig, await sign(payload, secret))) return null;
  try {
    const s = JSON.parse(fromB64(payload));
    return s && s.exp > now ? s : null;
  } catch { return null; }
}

// only allow going back to a page inside /admin after signing in
export const safeNext = (n) => (typeof n === "string" && /^\/admin(\/|\?|$)/.test(n) && !/^\/admin\/(login|setup)/.test(n) && !n.includes("\\") ? n : "/admin");

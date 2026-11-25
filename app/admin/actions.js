"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, timingSafeEqual } from "node:crypto";
import { COOKIE, MAX_AGE, createSession, safeNext } from "../../lib/session.js";
import { getAdmin, createAdmin, saveAdmin, hashPassword, checkPassword, checkSetupCode, clearSetupCode, validUsername, passwordProblem, newSecret } from "../../lib/adminstore.js";
import { requireAdmin } from "../../lib/auth.js";
import { blocked, fail, clear } from "../../lib/limit.js";

const sha = (s) => createHash("sha256").update(String(s)).digest();
const same = (a, b) => timingSafeEqual(sha(a), sha(b));
const ip = () => String(headers().get("x-forwarded-for") || "local").split(",")[0].trim();
const text = (fd, k) => String(fd.get(k) ?? "");

async function startSession(user, secret) {
  cookies().set(COOKIE, await createSession(user, secret), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE });
}

export async function login(formData) {
  const next = safeNext(text(formData, "next"));
  const user = text(formData, "username").trim().toLowerCase();
  const pass = text(formData, "password");
  const key = "login:" + ip();
  if (blocked(key, 8)) redirect(`/admin/login?error=wait&next=${encodeURIComponent(next)}`);

  let admin = null, userOk = false, passOk = false, down = false;
  try {
    admin = await getAdmin();
    if (admin) { userOk = same(user, admin.username.toLowerCase()); passOk = await checkPassword(pass, admin.hash); } // both always checked
  } catch { down = true; }
  if (down) redirect("/admin/login?error=db");
  if (!admin) redirect("/admin/setup");
  if (!(userOk && passOk)) {
    fail(key);
    await new Promise((r) => setTimeout(r, 700)); // slows down guessing
    redirect(`/admin/login?error=1&next=${encodeURIComponent(next)}`);
  }
  clear(key);
  await startSession(admin.username, admin.secret);
  redirect(next);
}

// first-time setup: creates the one admin account
export async function setupAdmin(formData) {
  const key = "setup:" + ip();
  if (blocked(key, 6)) redirect("/admin/setup?error=wait");
  const code = text(formData, "code"), username = text(formData, "username").trim();
  const password = text(formData, "password"), confirm = text(formData, "confirm");

  let result = "ok", created = null;
  try {
    if (await getAdmin()) result = "exists";
    else if (!(await checkSetupCode(code))) result = "code";
    else if (!validUsername(username)) result = "username";
    else if (passwordProblem(password, username)) result = passwordProblem(password, username);
    else if (password !== confirm) result = "match";
    else { created = await createAdmin(username, password); if (created) await clearSetupCode(); else result = "exists"; }
  } catch { result = "db"; }
  if (result === "exists") redirect("/admin/login");
  if (result !== "ok") { fail(key); redirect(`/admin/setup?error=${result}`); }
  clear(key);
  await startSession(created.username, created.secret);
  redirect("/admin");
}

// change username and/or password (needs the current password)
export async function changeAccount(formData) {
  const admin = await requireAdmin();
  const key = "acct:" + ip();
  if (blocked(key, 8)) redirect("/admin/account?error=wait");
  const current = text(formData, "currentPassword"), username = text(formData, "username").trim();
  const pw = text(formData, "newPassword"), confirm = text(formData, "confirm");

  let result = "ok", updated = null;
  try {
    if (!(await checkPassword(current, admin.hash))) result = "current";
    else if (!validUsername(username)) result = "username";
    else if (username === admin.username && !pw) result = "nochange";
    else if (pw && passwordProblem(pw, username)) result = passwordProblem(pw, username);
    else if (pw && pw !== confirm) result = "match";
    else updated = await saveAdmin({ username, hash: pw ? await hashPassword(pw) : admin.hash, secret: newSecret() }); // new secret signs out every other device
  } catch { result = "db"; }
  if (result !== "ok") { if (result === "current") fail(key); redirect(`/admin/account?error=${result}`); }
  clear(key);
  await startSession(updated.username, updated.secret);
  redirect("/admin/account?msg=saved");
}

export async function signOutEverywhere() {
  const admin = await requireAdmin();
  let updated = null;
  try { updated = await saveAdmin({ secret: newSecret() }); } catch {}
  if (!updated) redirect("/admin/account?error=db");
  await startSession(admin.username, updated.secret);
  redirect("/admin/account?msg=others");
}

export async function logout() {
  cookies().delete(COOKIE);
  redirect("/admin/login");
}

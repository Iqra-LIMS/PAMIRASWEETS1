// Server only: used inside admin pages and actions. Checks the signed-in cookie against the admin account in the database.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, readSession } from "./session.js";
import { getAdmin } from "./adminstore.js";

export async function requireAdmin() {
  let admin;
  try { admin = await getAdmin(); } catch { redirect("/admin/login?error=db"); }
  if (!admin) redirect("/admin/setup");
  const s = await readSession(cookies().get(COOKIE)?.value, admin.secret);
  if (!s || s.u !== admin.username) redirect("/admin/login");
  return admin;
}

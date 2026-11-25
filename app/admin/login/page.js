import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, readSession, safeNext } from "../../../lib/session.js";
import { getAdmin } from "../../../lib/adminstore.js";
import { login } from "../actions";
import PasswordField from "../../../components/PasswordField";

export const dynamic = "force-dynamic";
export const metadata = { title: "PAMIRA admin sign in", robots: "noindex" };

const MESSAGES = {
  1: "Wrong username or password. Please try again.",
  wait: "Too many failed attempts. Please wait 10 minutes and try again.",
  db: "Cannot reach the database. Is PostgreSQL running, and is DATABASE_URL in .env.local correct? Open /api/health to check.",
};

export default async function Login({ searchParams }) {
  const next = safeNext(searchParams?.next);
  let admin;
  try { admin = await getAdmin(); } catch { admin = undefined; }
  if (admin === null) redirect("/admin/setup"); // no admin account yet
  if (admin && (await readSession(cookies().get(COOKIE)?.value, admin.secret))) redirect(next);
  const error = admin === undefined ? MESSAGES.db : MESSAGES[searchParams?.error];

  return (
    <main className="lg">
      <form className="lg-card" action={login}>
        <img src="/logo.png" alt="PAMIRA" />
        <h1>Admin sign in</h1>
        <p className="small">Sign in to manage orders and prices.</p>
        {error && <p className="pr-err" role="alert">{error}</p>}
        <label className="lg-field">
          Username
          <input name="username" type="text" autoComplete="username" required autoFocus />
        </label>
        <PasswordField />
        <input type="hidden" name="next" value={next} />
        <button className="btn gold" type="submit">Sign in</button>
        <Link href="/" className="link">← Back to the shop</Link>
        <p className="small">Forgot your password? See "Forgot the admin password" in the README.</p>
      </form>
    </main>
  );
}

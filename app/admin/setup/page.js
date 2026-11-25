import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin, ensureSetupCode } from "../../../lib/adminstore.js";
import { setupAdmin } from "../actions";
import PasswordField from "../../../components/PasswordField";

export const dynamic = "force-dynamic";
export const metadata = { title: "PAMIRA admin setup", robots: "noindex" };

const MESSAGES = {
  code: "That setup code is not right. Copy it exactly from the server log.",
  username: "Username: 3 to 32 characters, using letters, numbers, dot, dash or underscore.",
  short: "The password needs at least 10 characters.",
  long: "The password is too long (100 characters at most).",
  same: "The password must be different from the username.",
  match: "The two passwords do not match.",
  wait: "Too many attempts. Please wait 10 minutes and try again.",
  db: "Cannot reach the database. Is PostgreSQL running, and is DATABASE_URL in .env.local correct? Open /api/health to check.",
};

export default async function Setup({ searchParams }) {
  let admin, code;
  try { admin = await getAdmin(); if (!admin) code = await ensureSetupCode(); } catch { return <Shell><p className="pr-err" role="alert">{MESSAGES.db}</p></Shell>; }
  if (admin) redirect("/admin/login");
  console.log(`\n==== PAMIRA admin setup code: ${code} ====\n`); // only the person who runs the server can see this

  return (
    <Shell>
      <form className="lg-card" action={setupAdmin}>
        <img src="/logo.png" alt="PAMIRA" />
        <h1>Create your admin account</h1>
        <p className="small">First time here. Choose the username and password you will use to sign in to the admin area.</p>
        {MESSAGES[searchParams?.error] && <p className="pr-err" role="alert">{MESSAGES[searchParams.error]}</p>}
        <label className="lg-field">
          Setup code
          <input name="code" type="text" autoComplete="off" autoCapitalize="characters" spellCheck="false" required autoFocus />
          <span className="small">Look in the terminal where the website is running (or your host's logs) for the line "PAMIRA admin setup code". This proves you are the owner.</span>
        </label>
        <label className="lg-field">
          Username
          <input name="username" type="text" autoComplete="username" defaultValue="admin" required />
        </label>
        <PasswordField label="Password" autoComplete="new-password" hint="At least 10 characters. A short sentence works well." />
        <PasswordField name="confirm" label="Repeat password" autoComplete="new-password" />
        <button className="btn gold" type="submit">Create account and sign in</button>
        <Link href="/" className="link">← Back to the shop</Link>
      </form>
    </Shell>
  );
}

function Shell({ children }) {
  return <main className="lg">{children}</main>;
}

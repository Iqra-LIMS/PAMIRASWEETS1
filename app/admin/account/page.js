import Link from "next/link";
import { requireAdmin } from "../../../lib/auth.js";
import { changeAccount, signOutEverywhere, logout } from "../actions";
import PasswordField from "../../../components/PasswordField";

export const dynamic = "force-dynamic";
export const metadata = { title: "PAMIRA admin account", robots: "noindex" };

const MESSAGES = {
  current: "Your current password is wrong.",
  username: "Username: 3 to 32 characters, using letters, numbers, dot, dash or underscore.",
  short: "The new password needs at least 10 characters.",
  long: "The new password is too long (100 characters at most).",
  same: "The password must be different from the username.",
  match: "The two new passwords do not match.",
  nochange: "Nothing to change. Enter a new username or a new password.",
  wait: "Too many wrong attempts. Please wait 10 minutes and try again.",
  db: "Cannot reach the database. Please try again.",
};
const DONE = { saved: "Saved. You are still signed in here; every other device was signed out.", others: "Every other device was signed out." };

export default async function Account({ searchParams }) {
  const admin = await requireAdmin();
  const err = MESSAGES[searchParams?.error];
  const msg = DONE[searchParams?.msg];
  return (
    <main className="ad">
      <header className="ad-bar">
        <h1>Account</h1>
        <span className="ad-links"><Link href="/admin" className="link">← Orders</Link> <form action={logout}><button className="link">Log out</button></form></span>
      </header>
      <p className="small">Signed in as <b>{admin.username}</b>. Last changed {new Date(admin.updatedAt).toLocaleString("en-GB", { timeZone: "Asia/Karachi" })}.</p>
      {msg && <p className="ad-msg" role="status">{msg}</p>}
      {err && <p className="pr-err" role="alert">{err}</p>}

      <form action={changeAccount} className="pr-group acct">
        <h2>Change username or password</h2>
        <label className="lg-field">
          Username
          <input name="username" type="text" defaultValue={admin.username} autoComplete="username" required />
        </label>
        <PasswordField name="newPassword" label="New password" autoComplete="new-password" required={false} hint="Leave empty to keep your current password. At least 10 characters." />
        <PasswordField name="confirm" label="Repeat new password" autoComplete="new-password" required={false} />
        <PasswordField name="currentPassword" label="Current password (to confirm it is you)" />
        <button className="btn gold" type="submit">Save changes</button>
        <p className="small">Saving signs out every other device.</p>
      </form>

      <form action={signOutEverywhere} className="pr-group acct">
        <h2>Sign out of all devices</h2>
        <p className="small">Use this if you signed in on a shared computer. You stay signed in here.</p>
        <button className="btn ghost" type="submit">Sign out of all other devices</button>
      </form>
    </main>
  );
}

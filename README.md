# PAMIRA website (Next.js 14 + PostgreSQL), one project

Shop, checkout, orders, prices and admin are all in this project. Orders and prices are stored in PostgreSQL.

## Run it
    npm install
    copy .env.example .env.local      (Mac/Linux: cp .env.example .env.local)
    notepad .env.local                (set DATABASE_URL)
    npm run dev                       # http://localhost:3000

Restart `npm run dev` after every change to `.env.local`.

## Database (PostgreSQL), you must have one running
Open http://localhost:3000/api/health. If it says `"database": "connected"` you are done. If it says `ECONNREFUSED`, nothing is answering at the address in `DATABASE_URL`. Fix it with ONE of these:

**A. Free hosted database (easiest, nothing to install)**
1. Create a free account at neon.tech (or supabase.com) and create a project.
2. Copy the connection string they show (starts with `postgres://` or `postgresql://`).
3. Paste it as `DATABASE_URL` in `.env.local`, save, restart `npm run dev`, and open /api/health again.

**B. PostgreSQL on your own computer (Windows)**
1. Install PostgreSQL from postgresql.org (the installer asks you to choose a password for the `postgres` user; remember it).
2. Make sure the service is running (Windows key, type `services`, look for `postgresql-x64-...` with status Running).
3. Open pgAdmin, right click Databases, Create, Database, name it `pamira`.
4. Set `DATABASE_URL=postgres://postgres:YOURPASSWORD@localhost:5432/pamira`.

The tables (`orders`, `order_items`, `settings`) are created automatically the first time they are needed. The same SQL is in `db/schema.sql`.

## Admin (username and password are created on the website, not in .env.local)
1. Open http://localhost:3000/admin. The first time, you land on **Create your admin account**.
2. It asks for a **setup code**. Look in the terminal where `npm run dev` is running (or your host's logs) for the line `PAMIRA admin setup code: XXXXXXXX`. This proves you are the owner, so nobody else can claim the account first.
3. Choose your username and a password (at least 10 characters) and press Create. You are signed in.
From then on, `/admin` shows the sign in page. Inside you will find orders in tabs, search, one-click status buttons, WhatsApp messages, printable delivery slips, **Edit prices** and **Account**.

- **Change your username or password:** `/admin/account` (needs your current password). Saving signs out every other device. There is also a "Sign out of all other devices" button there.
- **Security:** the password is stored only as a salted hash (scrypt) in PostgreSQL, never in plain text. You stay signed in for 7 days on that browser. After 8 wrong attempts from one address, sign in is blocked for 10 minutes. On a real website, use https.
- **Forgot the admin password?** Run `npm run reset-admin` in the project folder (it needs `DATABASE_URL` in `.env.local`). It removes the admin account; then open `/admin` and create a new one with a fresh setup code. Orders and prices are not touched.

## How prices are checked
Prices never come from the browser. They are worked out on the server (`lib/pricing.js`) from the price book stored in PostgreSQL.
1. **Before ordering:** the cart asks `/api/quote` and shows the server's prices.
2. **Placing the order:** the browser sends the total the customer saw. If the server's total differs, the order is not saved; the customer sees the new total and confirms again.
3. **After saving:** the order is read back from PostgreSQL and every line is re-priced from its saved choices. The result is stored in `orders.price_verified` and shown in the admin.

## Changing prices (no redeploy)
`/admin/prices` edits every price: date kinds, shapes, chocolates, box fee, hampers, delivery fees per city and the free-delivery limit. New orders use the new prices straight away; old orders keep theirs.

## Emails (optional)
Fill in the `SMTP_*` and `OWNER_EMAIL` lines. For Gmail use an App Password.

## Content you will edit
- Prices: `/admin/prices` (defaults are in `lib/menu.js`, `lib/pricing.js`, `lib/delivery.js`)
- Names of dates, shapes, fillings, hampers and the list of cities: `lib/menu.js`, `lib/delivery.js`
- WhatsApp number: `WHATSAPP` in `components/CartDrawer.js`
- Photos: `public/images`

## Hosting
Any Node host works (Render, Railway, a VPS). Set `DATABASE_URL` (and optionally `SMTP_*`) as environment variables on the host. Then open `/admin` once to create your admin account; the setup code appears in the host's logs. Build command: `npm install && npm run build`. Start command: `npm start`.
"# PAMIRASWEETS1" 

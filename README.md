# HB Bank

A modern, bilingual (English / Arabic, full RTL) demo banking website inspired by
Banque Misr — with a **real Supabase backend** (Auth + Postgres + Row-Level
Security). No build step: plain HTML/CSS/JS that loads the Supabase SDK from a CDN.

> ⚠️ **Demo only.** HB Bank is not a real financial institution. Don't enter real
> personal or payment information.

## Features

- **Marketing site** (`index.html`) — rotating hero, products, exchange-rate
  widget, stats, and footer, in a Banque Misr-style layout.
- **Authentication** (`login.html`) — email/password sign in & sign up.
- **Online banking** (`dashboard.html`):
  - Overview with total balance and account cards
  - **Money transfers** (atomic, server-side; internal transfers credit the
    recipient instantly)
  - **Saved payees** — store frequent recipients and one-tap them into a transfer
  - **Bill payments** — pay utilities and services straight from an account
  - **Cards** — view virtual debit cards, reveal the number, freeze/unfreeze instantly
  - **Savings goals** — set targets and move money aside with a progress bar
  - **Spending insights** — money in vs out and top spending, computed from history
  - **Transaction history** with per-account filtering and **CSV export**
  - **Request money** — generate a shareable payment request with a QR code
  - **Tools** — currency converter and loan calculator
  - Profile **settings** and **change password**
- **Bilingual & RTL** — switch between English and Arabic anywhere; layout
  mirrors and fonts swap automatically. Preference is saved.
- **Teal/green** brand theme, fully responsive with a mobile nav.
- New users are auto-provisioned (via a DB trigger) with a **current** and a
  **savings** account seeded with demo balances, so transfers work immediately.

## Quick start

The backend is **already provisioned and wired up** (`config.js` holds the live
Supabase URL + publishable key). Because the app uses ES modules, serve it over
HTTP — don't open it as a `file://` path:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

### Demo login

A ready-to-use, pre-confirmed account:

| Email | Password |
| --- | --- |
| `demo@hbbank.app` | `DemoPass123!` |

Or click **Open Account** to sign up your own (see the note on email
confirmation in [SETUP.md](SETUP.md)).

To try a transfer, sign in, open **Transfer**, and send money from your current
account to your **savings** account number (shown on the account card).

## Tech stack

- **Frontend:** vanilla HTML/CSS/JS, ES modules, no bundler.
- **Backend:** [Supabase](https://supabase.com) — Auth, Postgres, RLS, and a
  `SECURITY DEFINER` `transfer_funds()` function for atomic transfers.
- **SDK:** `@supabase/supabase-js` v2 via jsDelivr CDN.
- **Fonts:** Poppins (Latin) + Cairo (Arabic) from Google Fonts.

## Project structure

```
index.html              Marketing homepage
login.html              Sign in / sign up
dashboard.html          Online banking
config.js               Supabase URL + publishable key (public by design)
assets/css/styles.css   Teal/green theme + RTL
assets/js/
  supabase.js  i18n.js  auth.js  marketing.js  login.js  dashboard.js
supabase/migrations/
  0001_init.sql         Schema, RLS, sign-up trigger, transfer function
  0002_features.sql     Cards, savings goals, bill-pay/goal/card-freeze RPCs
```

## Security model

- **RLS is enabled on every table.** Users can read only their own profile,
  accounts, and transactions.
- Balances are **never written from the client.** They change only through
  `SECURITY DEFINER` functions — `transfer_funds()`, `pay_bill()` and
  `contribute_to_goal()` — each of which verifies account ownership via
  `auth.uid()`, checks the balance, and writes atomically with row locks.
  Card freeze/unfreeze goes through `set_card_status()`, which only touches the
  caller's own card.
- The publishable key in `config.js` is safe to expose — it's designed for the
  browser; security is enforced by RLS, not by hiding the key.

See **[SETUP.md](SETUP.md)** to point the app at your own Supabase project.

# HB Bank — Setup & Backend Guide

The backend is **already provisioned and connected** — you don't need to do
anything to run the app. This guide documents the live setup and shows how to
point the app at your **own** Supabase project if you'd rather host the data
yourself.

> **Demo only.** HB Bank is not a real financial institution.

## Running the app

The app uses ES modules, so it must be served over HTTP (not opened as a
`file://` path):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static host works too (Netlify, Vercel, GitHub Pages, Supabase Storage, …).

### Demo login (pre-confirmed)

| Email | Password |
| --- | --- |
| `demo@hbbank.app` | `DemoPass123!` |

This account already has a current account (50,000 EGP) and a savings account
(25,000 EGP). Try moving money between them from the **Transfer** screen.

## What's already configured

- A dedicated Supabase project (`hb-bank`) on the free tier.
- The schema, RLS policies, sign-up trigger, and `transfer_funds()` function
  from [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql),
  applied to that project.
- [`config.js`](config.js) populated with the project URL + publishable key
  (these are public by design — data is protected by RLS, not by hiding the key).

### Note on new sign-ups & email confirmation

The demo account above is pre-confirmed and always works. For **brand-new
sign-ups** through the app: if Supabase's **“Confirm email”** setting is on
(the default), a new user must click the confirmation link emailed to them
before they can sign in — the app shows a “check your inbox” message in that
case. To allow instant sign-in for the demo, turn it off in the dashboard:
**Authentication → Sign In / Providers → Email → disable “Confirm email”.**

---

## Use your own Supabase project (optional)

1. **Create a project** at [supabase.com](https://supabase.com) (free tier is fine).
2. **Run the migration:** open **SQL Editor**, paste all of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), and
   **Run**. (CLI alternative: `supabase db push`.)
3. **(Optional) disable email confirmation** for instant sign-in — see above.
4. **Add your credentials** to [`config.js`](config.js) from
   **Project Settings → API**:

   | Supabase value | `config.js` constant |
   | --- | --- |
   | Project URL | `SUPABASE_URL` |
   | `anon` / publishable key | `SUPABASE_ANON_KEY` |

5. **Serve** the site and sign up — you'll get a current + savings account
   seeded with demo balances automatically.

## Project structure

```
index.html              Marketing homepage
login.html              Sign in / sign up
dashboard.html          Online banking
config.js               Supabase URL + publishable key
assets/css/styles.css   Teal/green theme + RTL
assets/js/
  supabase.js  i18n.js  auth.js  marketing.js  login.js  dashboard.js
supabase/migrations/
  0001_init.sql         Schema, RLS, trigger, transfer function
```

## Security notes

- Every table has **RLS enabled**; users can only read their own data.
- Balances change only through the `SECURITY DEFINER` `transfer_funds()`
  function, which verifies ownership via `auth.uid()`, checks the balance, and
  writes both sides of the transfer atomically — the client can never write a
  balance directly.
- Internal helper functions (`generate_account_number`, `handle_new_user`) have
  their API `EXECUTE` access revoked; the sign-up trigger still fires normally.

# AIstands — Deployment Guide
## From code to live website in ~30 minutes

---

## STEP 1 — Set up Supabase (10 min)

1. Go to **supabase.com** → your project → **SQL Editor**
2. Paste the entire contents of `supabase-schema.sql` and click **Run**
3. Go to **Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`
4. Go to **Storage** and confirm the `documents` bucket was created

---

## STEP 2 — Set up Stripe (10 min)

1. Go to **dashboard.stripe.com → Products → + Add product**
2. Create these 4 products/prices:

   | Product | Price | Interval | Save the Price ID |
   |---------|-------|----------|-------------------|
   | Professional | £29 | Monthly | STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID |
   | Professional | £23 | Yearly | STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID |
   | Team | £79 | Monthly | STRIPE_TEAM_MONTHLY_PRICE_ID |
   | Team | £63 | Yearly | STRIPE_TEAM_ANNUAL_PRICE_ID |

3. Go to **Developers → API Keys** and copy:
   - Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Secret key → `STRIPE_SECRET_KEY`

4. Go to **Developers → Webhooks → Add endpoint**
   - URL: `https://aistands.com/api/stripe/webhook`
   - Events to listen for: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`
   - Copy the signing secret → `STRIPE_WEBHOOK_SECRET`

---

## STEP 3 — Get your Anthropic API key

1. Go to **platform.anthropic.com → API Keys → Create key**
2. Copy the key → `ANTHROPIC_API_KEY`

---

## STEP 4 — Deploy to Vercel (5 min)

1. Go to **github.com → New repository** → name it `aistands` → create it
2. Upload the project folder (or use GitHub Desktop to push the code)
3. Go to **vercel.com → Add New Project → Import** your GitHub repo
4. In Vercel's **Environment Variables** section, add ALL variables from `.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID=
STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID=
STRIPE_TEAM_MONTHLY_PRICE_ID=
STRIPE_TEAM_ANNUAL_PRICE_ID=
NEXT_PUBLIC_APP_URL=https://aistands.com
```

5. Click **Deploy** — Vercel builds and deploys automatically (~2 min)

---

## STEP 5 — Connect your domain (5 min)

1. In Vercel → your project → **Settings → Domains**
2. Add `aistands.com`
3. Vercel will show you DNS records to add
4. Go to your domain registrar (wherever you bought aistands.com)
5. Add the DNS records Vercel shows you
6. Wait 5–30 min for DNS to propagate — your site is live!

---

## STEP 6 — Test everything

- [ ] Visit aistands.com — homepage loads
- [ ] Sign up with a test email — confirmation email arrives
- [ ] Log in — dashboard loads
- [ ] Create a project — upload a document
- [ ] Ask a question — AI responds
- [ ] Generate a checklist — items appear
- [ ] Click "Upgrade" — Stripe checkout opens
- [ ] Use Stripe test card `4242 4242 4242 4242` — subscription activates

---

## Day-to-day running

**You don't need to do anything.** The platform is fully self-managing:
- Stripe handles all billing, renewals, and failed payments automatically
- Vercel auto-deploys any code updates you push to GitHub
- Supabase manages all data and auth automatically
- API costs are auto-charged to your Anthropic account as users query

**The only things you may want to do:**
- Check Stripe dashboard weekly to see revenue
- Check Supabase logs if any errors are reported
- Update standards tracking notifications (add to `supabase-schema.sql` when ready)

---

## Need help?

- Vercel docs: vercel.com/docs
- Supabase docs: supabase.com/docs
- Stripe docs: stripe.com/docs
- Anthropic docs: docs.anthropic.com

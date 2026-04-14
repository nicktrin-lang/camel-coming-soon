# Camel Global — Project Handover Document
> **Always paste this document at the start of every new conversation.**
> Update it at the end of each session before the chat fills up.

---

## Working Rules
- **Always paste the current file before Claude rewrites it.** Claude works from what you paste, not from memory. For small fixes this isn't needed, but for any full file rewrite, paste the file first.
- **Always give Claude the full file tree** at the start of a new chat by running: `find ~/camel-portal -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort`
- **Before any rewrite**, Claude will tell you which files to paste, or give you a command to cat them.
- **Always ask Claude to check the actual file** before rewriting — never assume the artifact is current.
- **Always provide the git push command** at the end of every change.

---

## Project Overview
- **Name:** Camel Global
- **Type:** Meet & greet car hire platform (Uber-style for car hire)
- **Stack:** Next.js 16, Supabase, Vercel, GitHub
- **Repo:** `github.com/nicktrin-lang/camel-portal`
- **Branch:** `main`
- **Local path:** `~/camel-portal`
- **Deployment:** Vercel (auto-deploys on push to main)
- **Cost target:** Zero / minimal

### How It Works
1. Customer submits a car hire request with pickup/dropoff details
2. All car hire companies (partners) within 30km radius are alerted and can bid
3. Customer accepts a bid → booking is confirmed
4. Driver delivers car to chosen location; fuel level recorded at delivery
5. Fuel level recorded again at collection
6. Customer pays only for fuel used (rounded to nearest ¼ tank)
7. Launching in Spain first, with USD support ready for future US rollout

### Three Portals
| Portal | Path | Users |
|--------|------|-------|
| Customer | `/test-booking` | End customers |
| Partner | `/partner` | Car hire companies |
| Driver | `/driver` | Delivery drivers |
| Admin | `/admin` | Camel Global staff |

---

## Tech Architecture

### Key Libraries & Files
| File | Purpose |
|------|---------|
| `lib/currency.ts` | All currency utilities — EUR, GBP, USD formatting + conversion |
| `lib/useCurrency.ts` | React hook — currency state, live rates, fmt helpers |
| `lib/supabase/browser.ts` | Supabase browser client (partner/admin) |
| `lib/supabase-customer/browser.ts` | Supabase browser client (customers) |
| `lib/portal/calculateFuelCharge.ts` | Fuel charge calculation logic |
| `lib/portal/calculateCommission.ts` | Commission calculation — 20% of hire, min €10 floor |
| `lib/portal/syncBookingStatuses.ts` | Booking status sync logic |
| `lib/portal/refreshPartnerLiveStatus.ts` | Core live status logic — checks all 7 requirements |
| `lib/portal/triggerPartnerLiveRefresh.ts` | Triggers the live status refresh |
| `app/api/currency/rate/route.ts` | Live rate API — fetches EUR→GBP,USD from frankfurter.app |
| `app/api/partner/refresh-live-status/route.ts` | POST endpoint — runs live status check for current partner |
| `app/api/partner/requests/[id]/route.ts` | Returns commissionRate + minimumCommission to bid form |

### Currency System
- **Storage:** All prices stored in the currency the booking was made in (`booking.currency`)
- **Supported:** `EUR | GBP | USD`
- **Rates:** Live from `frankfurter.app` (no API key), cached 1 hour, fallback to hardcoded rates
- **Fallback rates:** GBP 0.85, USD 1.08

### Commission System
- **Rate:** 20% of car hire price only (not fuel). Per-partner override available in admin.
- **Minimum:** €10 per booking floor — prevents gaming (e.g. partner setting hire at €1)
- **Fuel:** 0% commission — passes through 100% to partner
- **Storage:** `platform_settings` table holds default rate + minimum. `partner_profiles.commission_rate` overrides per partner.
- **DB columns on `partner_bookings`:** `commission_rate`, `commission_amount`, `partner_payout_amount`, `invoice_period`
- **Payout formula:** `(car_hire − commission) + fuel_charge`
- **Display:** Shown on bid form (live preview), partner bookings, partner reports, admin bookings, admin reports
- **Excel exports:** All exports include commission rate, commission amount, partner payout

### Live Status System
A partner account is **live** only when ALL of the following are true:
1. Fleet base address set (`base_address`)
2. Fleet base lat/lng set (`base_lat`, `base_lng`)
3. Service radius set (`service_radius_km > 0`)
4. At least one active fleet vehicle (`partner_fleet.is_active = true`)
5. At least one active driver (`partner_drivers.is_active = true`)
6. Billing currency set (`default_currency`)
7. VAT / NIF number set (`vat_number`) ← added Chat 8

### Business & Billing Details
Collected during onboarding (Business & Billing step) and editable by admin only:
- `legal_company_name` — appears on commission invoices
- `company_registration_number`
- `vat_number` — required for live status; used for reverse charge cross-border invoicing
- `commission_rate` — per-partner override (admin can change)
- `stripe_account_id`, `stripe_onboarding_status` — for future Stripe Connect

**VAT / NIF note:** Spanish companies use NIF (e.g. B12345678) which becomes ESB12345678 for EU transactions. Camel invoices partners with reverse charge — no UK VAT added. Invoice wording: *"VAT reverse charged to customer under Article 44/196 EU VAT Directive"*

**Partner profile page:** Business & Billing is read-only — partners cannot edit. Contact support@camel-global.com to change.
**Admin account page:** Business & Billing has an ✏️ Edit toggle with amber warning — only update if partner has contacted Camel Global.

### Insurance Documents Handover System
- **Driver app** — checkbox at delivery stage (hard blocker)
- **Customer portal** — `InsuranceConfirmCard` always visible
- **Partner portal** — read-only `InsuranceStatusCard`
- **DB columns:** `insurance_docs_confirmed_by_driver`, `insurance_docs_confirmed_by_driver_at`, `insurance_docs_confirmed_by_customer`, `insurance_docs_confirmed_by_customer_at`

### Driver Audit Trail System
- **DB columns:** `delivery_driver_id`, `delivery_driver_name`, `delivery_confirmed_at`, `collection_driver_id`, `collection_driver_name`, `collection_confirmed_at`
- `delivery_confirmed_at` = actual pickup timestamp (driver confirmed delivery to customer)
- `collection_confirmed_at` = actual dropoff timestamp (driver confirmed return from customer)
- Both used in Excel exports for "Actual Pickup Date & Time" and "Actual Dropoff Date & Time"

### Partner Login Flow
After sign-in, checks if onboarding is complete (`base_lat`, `base_lng`, `default_currency`, `vat_number` all set). If any missing → redirects to `/partner/onboarding`. Otherwise → `/partner/dashboard`.

---

## Current Stable State

### Last Known Good Tag
```bash
git checkout v-stable-commission-reporting
```
**Tag:** `v-stable-commission-reporting`
**Description:** Full commission and billing system. Business & Billing onboarding step (legal name, reg number, VAT/NIF). VAT as 7th live status check. Commission shown on bid form with live payout preview. Commission rate, commission amount, partner payout on all reporting pages and Excel exports. Partner login redirects to onboarding if incomplete. Admin can edit billing details and override commission rate per partner. Admin bookings and reports pages show unified columns matching reconciliation table. Actual pickup/dropoff timestamps from driver confirmation in Excel. Partner bookings page shows fuel charge/refund/payout correctly.

### Previous Stable Tags
| Tag | Description |
|-----|-------------|
| `v-stable-partner-reviews` | Full partner review system, admin moderation, 7-day reminder cron |
| `v-stable-admin-insurance-live-status` | Admin booking detail with insurance and driver audit trail |
| `v-stable-driver-audit-trail` | Driver audit trail — delivery/collection driver stamped permanently |
| `v-stable-insurance-handover` | Full insurance document handover flow |
| `v-stable-live-status-checks` | 6-check live status system |
| `v-stable-fuel-flow-fixed` | Full fuel confirmation flow working end to end |
| `v-stable-admin-booking-fixes` | Admin booking detail matches partner view |
| `v-stable-password-reset` | All three portals password reset fully working |
| `v-stable-currency-reporting` | Full EUR/GBP/USD revenue reporting |

### What Is Working ✅
- Customer booking flow (test-booking portal)
- Partner bid submission and management
- Driver job portal
- Admin approval and account management
- Full EUR / GBP / USD currency support throughout
- Live exchange rates with fallback
- Partner bookings page — per-currency revenue cards + commission + payout + fuel columns
- Admin bookings page — unified columns matching reconciliation table, correct payout
- Admin reports page — same columns as bookings, All Bookings section at top, partner breakdown with commission
- Partner reports page — commission column, correct payout, Excel with actual timestamps
- All Excel/CSV exports — commission rate, commission amount, payout, legal name, reg no, VAT/NIF, actual pickup/dropoff timestamps, completed date
- Fuel level recording, fuel charge/refund calculation
- Email notifications
- Google Maps integration
- Forgot/reset password flow on all three portals
- Live status system — 7 requirements (added VAT/NIF check)
- Partner login — redirects to onboarding if setup incomplete
- Partner onboarding — 6 steps including Business & Billing step
- Partner dashboard — setup checklist includes VAT/NIF
- Driver portal — independent header, auto-refresh, insurance checkbox
- Insurance handover — across all three portals
- Partner review system — ratings, replies, admin moderation, cron reminder
- **Commission system** — 20% default, min €10, per-partner override in admin, shown everywhere
- **Business & Billing** — collected in onboarding, read-only for partners, editable by admin
- **Billing details in exports** — legal company name, reg number, VAT/NIF in all Excel downloads

---

## Session Log

### Chat 8 (Current)
- Added `platform_settings` table (`default_commission_rate`, `minimum_commission_amount`)
- Added to `partner_profiles`: `legal_company_name`, `vat_number`, `company_registration_number`, `stripe_account_id`, `stripe_onboarding_status`, `commission_rate`
- Added to `partner_bookings`: `commission_rate`, `commission_amount`, `partner_payout_amount`, `invoice_period`
- Built `lib/portal/calculateCommission.ts` — 20% of hire, min €10 floor
- Added Business & Billing step to partner onboarding (step 3 of 6)
- VAT/NIF added as 7th live status check in `refreshPartnerLiveStatus.ts`
- Partner login redirects to onboarding if `base_lat`, `base_lng`, `default_currency`, `vat_number` not all set
- Partner profile Business & Billing section is read-only with support contact link
- Admin account detail — Business & Billing inline edit (read-only by default, ✏️ Edit with amber warning)
- Admin account detail — Commission Rate override card
- Commission shown on bid form with live 3-column preview (hire / commission / payout)
- Partner bookings page — added Commission, Fuel Charge, Fuel Refund, Your Payout columns; Export Excel matches reports format
- Partner reports page — Commission column added to reconciliation table; correct payout; Excel updated
- Admin bookings API — added `delivery_confirmed_at`, `collection_confirmed_at`, billing fields, commission fields
- Admin bookings page — unified columns, correct payout calc via `calcPayout()` helper
- Admin reports page — same columns, All Bookings section at top (10 at a time), Partner Breakdown shows commission
- All Excel exports — actual pickup/dropoff from `delivery_confirmed_at`/`collection_confirmed_at`, completed date, legal name, reg no, VAT/NIF
- Stable tag: `v-stable-commission-reporting`

### Chat 7 (Completed)
- Fuel flow fixes, driver layout, partner booking detail labels
- Stable tag: `v-stable-fuel-flow-fixed`

### Chat 6 (Completed)
- 6-check live status, dashboard banners, partner login redirect fix, driver portal polish
- Stable tag: `v-stable-live-status-checks`

### Chats 1–5 (Completed — see previous handover versions)

---

## Business Model & Roadmap

### Revenue Model
Camel Global operates as a **marketplace intermediary**. Camel takes commission and passes remainder to partner.

**Commission:** 20% of car hire price, minimum €10 per booking. 0% on fuel.
**Per-partner override:** Admin can set custom rate on account detail page.
**Invoicing:** Camel sends monthly commission invoice to partner (already collected via Stripe). No UK VAT — reverse charge applies (B2B cross-border). Invoice must include: *"VAT reverse charged — Article 44/196 EU VAT Directive"*. Invoicing handled in Xero, not in Camel system.

### Payment Architecture — Stripe Connect (To Build)
**Status:** Not yet built.
- Customer card held by Stripe at booking acceptance
- On completion: automatic split — partner share + Camel commission
- Partner bank details in Stripe only — never in Camel DB
- Use Stripe Connect Express accounts for partners
- Files to create: `app/api/stripe/`, `lib/stripe.ts`, `app/partner/payments/`

### Invoicing & Tax (To Build)
**Status:** Not yet built.
- Auto-generated monthly PDF commission invoices per partner via Xero
- VAT/IVA handling (UK 20%, Spain 21% — reverse charge for B2B EU)
- Files to create: `app/api/reports/commission/monthly/route.ts` (clean data endpoint for Xero)

### Finance Pages (To Build)
**Status:** Not yet built.
- `/admin/finance` — platform revenue dashboard (Camel's commission totals)
- `/partner/finance` — partner's commission/payout view

### Insurance Certificate Upload (To Build)
- Partners upload insurance certificate to profile
- Certificate expiry alerts (30 days warning)
- Expired = auto not-live

### Terms & Conditions (To Build)
- Customer and partner T&Cs with versioned acceptance

### Multilingual Support — English & Spanish (To Build)
- Portals are English only. Marketing homepage has EN/ES/IT/FR/DE.

### Embedded Insurance — Phase 3 (To Build)
- Approach AXA/Zurich after launch with real booking volume data
- Per-booking insurance included in price
- Phase in as optional "Camel Protected" tier, then make default

---

## Outstanding TODOs
- [ ] Stripe Connect integration (before first real payment)
- [ ] `app/partner/finance` and `app/admin/finance` pages
- [ ] Xero integration — monthly commission data endpoint
- [ ] `partner_profiles` — `stripe_account_id` onboarding flow in partner portal
- [ ] Insurance certificate upload to partner profile
- [ ] Terms & Conditions with versioned acceptance
- [ ] Reports pages multi-currency updates (partially done — commission added, full P&L TBD)
- [ ] Security headers in `next.config.ts` (CSP, HSTS, X-Frame-Options)
- [ ] Full RLS audit on all Supabase tables
- [ ] Rate limiting on `/api/auth/` routes
- [ ] GDPR data deletion endpoint
- [ ] DAC7 EU platform reporting (annual partner earnings)
- [ ] `app/partner/bids/` — folder exists, no page.tsx
- [ ] `app/api/admin/admin/requests/` — legacy duplicate, remove
- [ ] Clean up stray files: `main`, `camel-portal/camel-portal/`, `public/Screenshot *.png`
- [ ] `app/components/admin/AdminSidebar.tsx` and `PartnerSidebar.tsx` — unused, remove

---

## Useful Commands

```bash
# Push changes
git add .
git commit -m "your message"
git push origin main

# Show full file tree (paste to Claude at start of each chat)
find ~/camel-portal -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort

# Cat a file for Claude
cat ~/camel-portal/app/partner/bookings/page.tsx

# Create a stable rollback tag
git tag -a v-tag-name -m "description"
git push origin v-tag-name

# Roll back to a tag
git checkout v-tag-name

# List all tags
git tag

# Check what's changed
git status
git diff
```

---

## Environment
- `.env.local` — Supabase keys, Google Maps API key, Resend, CRON_SECRET
- Never commit `.env.local` — it is in `.gitignore`
- Vercel environment variables set separately in Vercel dashboard

---

*Last updated: Chat 8 — Commission system, Business & Billing, reporting and Excel exports fully working*
# Camel Global — Project Handover Document
> **Always paste this document at the start of every new conversation.**
> Update it at the end of each session before the chat fills up.

---

## Working Rules
- **Always paste the current file before Claude rewrites it.** Claude works from what you paste, not from memory.
- **Always give Claude the full file tree** at the start of a new chat: `find ~/camel-portal -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort`
- **Before any rewrite**, Claude will tell you which files to paste, or give you a command to cat them.
- **Always ask Claude to check the actual file** before rewriting — never assume the artifact is current.
- **Always provide the git push command** at the end of every change.
- **Claude must always write full files** — no partial diffs, no "change X to Y" instructions.

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

### Portals
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
| `lib/portal/calculateCommission.ts` | Commission — 20% of hire price, min €10 floor |
| `lib/portal/syncBookingStatuses.ts` | Booking status sync logic |
| `lib/portal/refreshPartnerLiveStatus.ts` | Core live status — checks all 7 requirements |
| `lib/portal/triggerPartnerLiveRefresh.ts` | Triggers the live status refresh |
| `app/api/currency/rate/route.ts` | Live rate API — fetches EUR→GBP,USD from frankfurter.app |
| `app/api/partner/refresh-live-status/route.ts` | POST endpoint — runs live status check |
| `app/api/partner/requests/[id]/route.ts` | Returns commissionRate + minimumCommission to bid form |
| `app/partner/terms/page.tsx` | Partner T&Cs page — public, no auth required |

### Currency System
- **Supported:** `EUR | GBP | USD`
- **Rates:** Live from `frankfurter.app`, cached 1 hour, fallback GBP 0.85 / USD 1.08
- **Storage:** All prices stored in the currency the booking was made in

### PDF Downloads
- All PDF exports use **jsPDF** (`npm install jspdf`) — real `.pdf` files, direct download, no print dialog
- Operating Rules PDF: `downloadOperatingRulesPDF()` in `app/partner/account/page.tsx`
- Partner T&Cs PDF: `downloadTermsPDF()` in `app/partner/terms/page.tsx` and `app/partner/signup/page.tsx`

---

## Commission & Payments Model

### The Model
Camel is a **platform intermediary**, not a seller.
- **Partner** = supplier → issues VAT invoice to customer
- **Camel** = intermediary → earns commission → invoices partner
- **Customer** = pays full booking price once

T&Cs must state: *"Camel acts as an intermediary platform. The rental contract is between the customer and the partner."*

### Money Flow
```
Customer pays £200
       ↓
   Stripe (splits instantly)
       ↓              ↓
  £160 → Partner   £40 → Camel
  Stripe balance   Stripe balance
```

### Commission Structure
| Rule | Value |
|------|-------|
| Default rate | 20% of hire price only |
| Minimum per booking | €/£10 floor |
| Fuel charges | 0% — passes through 100% to partner |
| Per-partner override | Admin can set custom rate |

### Payout Formula
```
Partner Payout = (Car Hire − Commission) + Fuel Charge
```
Example: £300 hire, 20% commission (£60), £25 fuel charge → **£265 payout**

### VAT & Tax
| Transaction | Treatment |
|-------------|-----------|
| Customer pays partner (via Camel) | Spanish VAT — partner's responsibility |
| Camel invoices partner for commission | Reverse charge — no UK VAT added |

Invoice must include: *"VAT reverse charged to customer under Article 44/196 EU VAT Directive"*

### VAT / NIF Note
Spanish companies use NIF (e.g. B12345678) = ESB12345678 for EU transactions. Collected during onboarding. Required for live status. Admin can edit if partner contacts Camel Global.

### What Goes on a Camel Commission Invoice
- Camel company name, address, VAT number
- Partner legal company name, address, VAT/NIF number
- Invoice number, date, period (e.g. "June 2025")
- Line item: "Platform commission on completed bookings — [period]"
- Number of bookings, total value processed, commission rate, commission amount
- Currency
- Reverse charge line: *"VAT reverse charged — Article 44/196 EU VAT Directive"*
- Total due: £0.00 (already collected via Stripe)

**Invoicing lives in Xero, not in the Camel system.** Camel exports clean data; Xero generates and sends invoices.

### Platform Settings Table
Single row in `platform_settings`:
- `default_commission_rate` = 20.00
- `minimum_commission_amount` = 10.00

---

## Live Status System (7 checks)
A partner account is **live** only when ALL are true:
1. Fleet base address set (`base_address`)
2. Fleet base GPS set (`base_lat`, `base_lng`)
3. Service radius set (`service_radius_km > 0`)
4. At least one active fleet vehicle
5. At least one active driver
6. Billing currency set (`default_currency`)
7. VAT / NIF number set (`vat_number`)

---

## Partner Terms & Conditions System

### How It Works
- T&Cs live at `/partner/terms` — public page, no auth required, renders with sidebar when logged in
- Partners accept T&Cs during signup (Step 5 checkbox)
- Acceptance is recorded in `partner_applications` at the point of account creation
- The T&Cs link on the signup form triggers an inline PDF download (no navigation away)

### DB Columns (partner_applications)
- `terms_accepted_at` (timestamptz) — when the partner accepted
- `terms_version` (text) — version string e.g. `"2026-04"`

### Current Version
- Version: `2026-04`
- Effective: `1 April 2026`

### Where T&Cs Acceptance Is Shown
- **Partner account page** (`/partner/account`) — Terms & Conditions card in sidebar
- **Admin account page** (`/admin/accounts/[id]`) — Terms & Conditions card in sidebar

### T&Cs vs Operating Rules
- **Operating Rules** = day-to-day conduct (bidding, vehicles, fuel, drivers) — shown on `/partner/account`
- **Partner T&Cs** = legal agreement (intermediary position, commission, liability, GDPR, governing law) — shown on `/partner/terms`
- Operating Rules are incorporated by reference into the T&Cs

---

## Business & Billing Details
Collected in onboarding step 3. Stored on `partner_profiles`:
- `legal_company_name` — on commission invoices
- `company_registration_number`
- `vat_number` — required for live status
- `commission_rate` — per-partner override
- `stripe_account_id`, `stripe_onboarding_status`

**Partner profile page:** Read-only. Contact support@camel-global.com to change.
**Admin account page:** Inline ✏️ Edit with amber warning — only update if partner has contacted Camel Global.

---

## Insurance Documents Handover System
- **Driver app** — checkbox hard blocker at delivery
- **Customer portal** — `InsuranceConfirmCard` always visible
- **Partner portal** — read-only `InsuranceStatusCard`
- **DB columns:** `insurance_docs_confirmed_by_driver/at`, `insurance_docs_confirmed_by_customer/at`

---

## Driver Audit Trail System
- **DB columns:** `delivery_driver_id/name`, `delivery_confirmed_at`, `collection_driver_id/name`, `collection_confirmed_at`
- `delivery_confirmed_at` = actual pickup timestamp
- `collection_confirmed_at` = actual dropoff timestamp
- Both used in Excel exports for actual pickup/dropoff columns

---

## Fuel Confirmation Flow
- Driver records fuel at delivery and collection
- Customer confirms each reading independently
- Both must agree to lock each stage
- Partner has office override
- `fuel_charge` and `fuel_refund` stored on booking at completion
- **Payout = (hire − commission) + fuel_charge**

---

## Partner Login Flow
After sign-in checks: `base_lat`, `base_lng`, `default_currency`, `vat_number` all set.
- Missing any → `/partner/onboarding`
- All set → `/partner/dashboard`

---

## Partner Onboarding Steps (6 steps)
1. Fleet Location
2. Currency
3. Business & Billing (legal name, reg no, VAT/NIF)
4. Car Fleet
5. Drivers
6. Go Live (7-check progress bar)

---

## Partner Layout — Public Routes
The following routes bypass auth in `app/partner/layout.tsx` (`isPublicPartnerPage`):
- `/partner/login`
- `/partner/reset-password`
- `/partner/application-submitted`
- `/partner/signup` and `/partner/signup/*`

Note: `/partner/terms` is **not** in the public list — logged-in partners see it with the sidebar. Unauthenticated users are redirected to login (fine — the signup form uses inline PDF download, not the terms page URL).

---

## DB Columns Added Chat 8
**`partner_profiles`:** `legal_company_name`, `vat_number`, `company_registration_number`, `stripe_account_id`, `stripe_onboarding_status`, `commission_rate`

**`partner_bookings`:** `commission_rate`, `commission_amount`, `partner_payout_amount`, `invoice_period`

**`platform_settings`** (new table): `default_commission_rate`, `minimum_commission_amount`

## DB Columns Added Chat 9
**`partner_applications`:** `terms_accepted_at`, `terms_version`

---

## Current Stable State

### Last Known Good Tag
```bash
git checkout v-stable-partner-terms
```
**Description:** Partner T&Cs page, versioned acceptance recorded at signup, T&Cs card on partner account page and admin account page, jsPDF real PDF downloads for T&Cs and Operating Rules, currency check removed from approvals Setup Summary.

### All Stable Tags
| Tag | Description |
|-----|-------------|
| `v-stable-partner-terms` | Partner T&Cs, versioned acceptance, PDF downloads, admin T&Cs card |
| `v-stable-commission-reporting` | Full commission system, billing details, reporting, Excel exports |
| `v-stable-partner-reviews` | Partner review system, admin moderation, 7-day reminder cron |
| `v-stable-admin-insurance-live-status` | Admin booking detail with insurance and driver audit trail |
| `v-stable-driver-audit-trail` | Driver audit trail — stamped permanently |
| `v-stable-insurance-handover` | Full insurance document handover flow |
| `v-stable-live-status-checks` | 6-check live status system |
| `v-stable-fuel-flow-fixed` | Full fuel confirmation flow |
| `v-stable-admin-booking-fixes` | Admin booking detail matches partner view |
| `v-stable-password-reset` | All three portals password reset |
| `v-stable-currency-reporting` | Full EUR/GBP/USD revenue reporting |

---

## What Is Working ✅
- Customer booking flow
- Partner bid submission and management
- Driver job portal
- Admin approval and account management
- Full EUR / GBP / USD currency support
- Partner bookings — commission, fuel charge/refund, payout columns
- Admin bookings — unified columns, correct payout
- Admin reports — same columns, All Bookings section, partner breakdown with commission
- Partner reports — commission column, correct payout, Excel with actual timestamps
- All Excel exports — commission rate/amount/payout, legal name, VAT/NIF, reg no, actual timestamps
- Fuel level recording, charge/refund calculation
- Email notifications + password reset on all three portals
- Google Maps integration
- Live status system — 7 checks
- Partner login → onboarding redirect if incomplete
- Partner onboarding — 6 steps including Business & Billing
- Driver portal — independent header, auto-refresh, insurance checkbox
- Insurance handover — all three portals
- Partner review system — ratings, replies, admin moderation, cron reminder
- Commission system — 20% default, min €10, per-partner override, shown everywhere
- Business & Billing — onboarding, read-only for partners, editable by admin
- Partner T&Cs — full legal document at `/partner/terms`, versioned acceptance at signup
- T&Cs acceptance recorded in DB with timestamp and version
- T&Cs card on partner account page and admin account page
- Real PDF downloads (jsPDF) for T&Cs and Operating Rules — no print dialog
- Admin approvals Setup Summary — currency check removed (set during onboarding not signup)

---

## Session Log

### Chat 9 (Current — Partner T&Cs)
- `app/partner/terms/page.tsx` — full T&Cs page, public route, jsPDF download
- `app/partner/signup/page.tsx` — T&Cs link triggers inline PDF download, no navigation
- `app/partner/layout.tsx` — terms page handled correctly (sidebar for logged-in, login redirect for unauthed)
- `app/partner/account/page.tsx` — T&Cs card in sidebar showing version + date accepted
- `app/admin/accounts/[id]/page.tsx` — T&Cs card in sidebar
- `app/api/admin/accounts/[id]/route.ts` — added `terms_accepted_at`, `terms_version` to select
- `app/api/partner/complete-signup/route.ts` — records `terms_accepted_at` and `terms_version` on signup
- DB migration: `alter table partner_applications add column terms_accepted_at timestamptz, add column terms_version text`
- jsPDF installed for real PDF downloads across all three download functions
- Fixed: currency showing "Yes" on approvals Setup Summary before onboarding
- Stable tag: `v-stable-partner-terms`

### Chat 8 (Completed — Commission & Payments)
- `platform_settings` table, commission columns on `partner_profiles` and `partner_bookings`
- `lib/portal/calculateCommission.ts`
- Business & Billing onboarding step (step 3)
- VAT/NIF as 7th live status check
- Partner login onboarding redirect
- Partner profile billing — read-only
- Admin billing — inline edit with warning
- Admin commission rate override per partner
- Commission on bid form with live 3-column preview
- Commission + payout in all reporting pages and Excel exports
- Actual pickup/dropoff timestamps from `delivery_confirmed_at` / `collection_confirmed_at`
- Unified table columns across all admin pages
- Stable tag: `v-stable-commission-reporting`

### Chat 7 (Completed)
- Fuel flow fixes, driver layout, partner booking detail
- Stable tag: `v-stable-fuel-flow-fixed`

### Chat 6 (Completed)
- 6-check live status, dashboard banners, partner login fix, driver portal
- Stable tag: `v-stable-live-status-checks`

### Chat 5 (Completed)
- Admin booking detail rebuilt, all three currencies everywhere
- Stable tag: `v-stable-admin-booking-fixes`

### Chat 4 (Completed)
- Reset-password pages all three portals, branded emails via Resend
- Stable tag: `v-stable-password-reset`

### Chat 3 (Completed)
- USD support, full EUR/GBP/USD revenue summary
- Stable tag: `v-stable-currency-reporting`

### Chats 1–2 (Completed)
- Project scaffolded, core booking flow, GBP support, live exchange rates

---

## Payments Build Phases

### Phase 1 — COMPLETE ✅
- [x] `platform_settings` table
- [x] Billing fields on `partner_profiles`
- [x] Commission fields on `partner_bookings`
- [x] `calculateCommission.ts`
- [x] Business & Billing onboarding step
- [x] VAT/NIF live status check
- [x] Commission on bid form with live preview
- [x] Commission in all reporting + Excel exports
- [x] Admin billing edit + commission rate override

### Phase 2 — Stripe Connect (before first real payment)
- [ ] `lib/stripe.ts` + `app/api/stripe/`
- [ ] Partner Stripe Express onboarding in partner portal
- [ ] Automatic payment split on completion
- [ ] Payout scheduling in admin
- [ ] Refund handling

### Phase 3 — Xero Automation (before first invoice run)
- [ ] `app/api/reports/commission/monthly/route.ts`
- [ ] Stripe → Xero connection
- [ ] Invoice template with reverse charge wording
- [ ] Auto-send monthly per partner

### Phase 4 — DAC7 Compliance (before EU scale)
- [ ] Annual partner earnings report
- [ ] Export for submission

### Phase 5 — Embedded Insurance (post-launch)
- [ ] Approach AXA/Zurich with real booking volume
- [ ] "Camel Protected" optional tier → default

---

## What NOT to Build Inside Camel
| Thing | Lives in |
|-------|----------|
| Invoice generation | Xero |
| VAT on full booking | Partner's system |
| Bank accounts | Stripe |
| Accountancy | Xero |
| Tax filing | Accountant |

---

## Outstanding TODOs
- [ ] Stripe Connect integration
- [ ] `/partner/finance` and `/admin/finance` pages
- [ ] Xero monthly commission data endpoint
- [ ] Partner Stripe onboarding flow in portal
- [ ] Terms & Conditions versioned re-acceptance flow (notify partners when T&Cs update)
- [ ] Security headers in `next.config.ts`
- [ ] Full RLS audit on all Supabase tables
- [ ] Rate limiting on `/api/auth/` routes
- [ ] GDPR data deletion endpoint
- [ ] DAC7 EU platform reporting
- [ ] `app/partner/bids/` — no page.tsx, build or remove
- [ ] `app/api/admin/admin/requests/` — legacy duplicate, remove
- [ ] Clean up: `main`, `camel-portal/camel-portal/`, `public/Screenshot *.png`
- [ ] Remove unused `AdminSidebar.tsx` and `PartnerSidebar.tsx`

---

## Useful Commands

```bash
# Push changes
git add .
git commit -m "your message"
git push origin main

# Full file tree
find ~/camel-portal -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' | sort

# Cat a file
cat ~/camel-portal/app/partner/bookings/page.tsx

# Create stable tag
git tag -a v-tag-name -m "description"
git push origin v-tag-name

# Roll back
git checkout v-tag-name

# List tags
git tag | grep stable
```

---

## Environment
- `.env.local` — Supabase keys, Google Maps API key, Resend, CRON_SECRET
- Never commit `.env.local`
- Vercel env vars set separately in Vercel dashboard

---

## Dependencies Added Chat 9
- `jspdf` — real PDF generation and download (`npm install jspdf`)

---

*Last updated: Chat 9 — Partner T&Cs, versioned acceptance, jsPDF downloads, admin T&Cs card*
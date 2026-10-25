# GK AutoHerb — Mobile App Update (Oct 2026)

What changed, and how to put it live.

## 0. Live deploy — 22 Oct 2026 (done)

Deployed to gkautobook.cloud. Before anything: full backup at `/root/backups/gk-before-deploy-20261022-023836` on the server (database dump, app folder with uploads, website, nginx and pm2 config) and a copy of the database dump in `Software (1)/deploy-backups/`.

Database: ran 086, 087, 088, 089 and `backfill_087` after a rehearsal on a copy of the live database. **No sample data was added**: the 3 demo coupons in 086 and the default birthday/anniversary offers and loyalty rewards in 087 were left out (create your own in Admin). Nothing existing was changed or deleted — only empty new tables, new columns, 33 message templates, 11 settings (same values the app already used as defaults), Garware/Astonish, and empty fields filled (22 vehicle types, 11 warranties, 24 service photos, 2 bike services).

Rollback (if ever needed): restore `db_full.sql.gz` and `app_root_app.tgz` / `www_gkauto.tgz` from the backup folder and `pm2 restart gk-backend`.

### Live fixes — 22 Oct 2026, 03:13 (code only, no database changes)
Backup first: `/root/backups/gk-before-fixes-20261022-030939`.
- Quick wash for a new car no longer fails: the pop-up asks for the customer's name + mobile; the server finds or creates the customer and saves the car to them.
- Chatbot knows the logged-in customer again (their car, job status, points) and personal questions come before the general FAQ; links fixed; loyalty text updated to 10% back.
- Bulk messages (Admin → Messages) no longer error while saving history; a history problem can't count as a failed send.
- Removed an old package "sync" step that wrote to a table that no longer exists (package credits are read live, so nothing changes for customers).
- "Mark package wash used" endpoint no longer writes a missing column.

**Still needs you (not code):**
1. **SMS:** 2Factor rejects every non-OTP SMS — register DLT templates with 2Factor, or connect the Meta WhatsApp API. OTP login SMS works.
2. **Payments:** the live server has **no Razorpay keys**, so online payments run in **mock/test mode** (no real money is collected). Add `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` to `/root/app/server/.env` (and `VITE_RAZORPAY_KEY_ID` in `/root/app/client/.env`, then rebuild) before taking real online payments.
3. **Chatbot FAQ text:** some answers in Admin → AI Bot still say "1 point per ₹100" — edit them to the 10% rule.

## 1. Deploy steps (production server)

Run these **once**, in this order, from the `server/` folder after pulling the new code:

```bash
node scripts/run_migration_files.js 087_mobile_app_features.sql
node scripts/run_migration_files.js 088_service_media_roles_and_brands.sql
node scripts/run_migration_files.js 089_whatsapp_journey_messages.sql
node scripts/backfill_087.js
```

- `087_mobile_app_features.sql` — adds the new tables/columns. Safe to run more than once.
- `backfill_087.js` — puts every service into a category (fixes the filters), sets warranty periods, stores each vehicle's pricing segment, and assigns the new service photos. It only fills empty values, so it never overwrites anything you changed in the admin panel.

Then rebuild the app (`client/`: `npm install && npm run build`) and restart the API. `npm install` is needed once because the live tracking map uses the new `leaflet` package.

> Note for local development: the local database was behind production (migrations 085/086 and three booking columns were missing). 087 adds the missing booking columns, so a fresh database works too.

## 2. Connecting WhatsApp (the only step left)

Everything — templates, reminders, auto-bot, inbox, birthday wishes — already runs. Until the API is connected, messages are **queued** with a one-tap WhatsApp link in Admin → WhatsApp, and SMS still goes out as before.

1. In Meta Business Manager create a WhatsApp Cloud API app and a permanent system-user token.
2. Add to `server/.env`:
   ```
   WHATSAPP_ACCESS_TOKEN=...
   WHATSAPP_PHONE_NUMBER_ID=...
   WHATSAPP_VERIFY_TOKEN=any-secret-you-choose
   WHATSAPP_APP_SECRET=...
   ```
3. In Meta → Webhooks, set the callback URL to `https://<your-domain>/api/whatsapp/webhook`, the verify token to the same `WHATSAPP_VERIFY_TOKEN`, and subscribe to `messages`.
4. Business-initiated messages (reminders, wishes, status updates) need Meta-approved templates. Create them in Meta, then in **Admin → WhatsApp → Automated Event Templates** open each one and fill in *Approved Meta template name*. The variable order `{{1}}, {{2}}…` is shown under the field.
5. Restart the API. Admin → WhatsApp → Inbox shows "WhatsApp Cloud API connected".

You can test the auto-bot any time (even before connecting) with **Admin → WhatsApp → Inbox → Test the auto-bot**.

## 3. What's new — by request

| # | Request | What was done |
|---|---|---|
| 1 | Unique service images | 26 studio photos generated in the GK red/black theme, one per service (`client/public/services/gk`). Services without a photo show a branded tile instead of repeating another service's photo. |
| 2 | Live GPS | Root causes fixed: every live-tracking socket connected to a wrong address (`/api` namespace) so no updates ever arrived; deliveries started at a hardcoded Vadodara point; admin-assigned deliveries were saved with the admin as driver; the address lookup invented area names when it failed. New: precise GPS fix (best of several readings), real Leaflet live map with moving car, distance/ETA, driver call button, screen wake-lock + accuracy indicator for the driver. |
| 3 | Price only for customer's car type | Price is decided on the **server** from the customer's vehicle (customers can no longer pick a cheaper segment). Services, details, booking, home and packages show only the price for the selected car. Package and advance payment amounts are also priced by the server. |
| 4 | Filters | Services: category chips (real categories with counts), car/bike, search, sort, budget, warranty-only. Store: working category chips, sort, in-stock. |
| 5 | Loyalty 10% | Points = admin-set % of every bill (default 10% → ₹2,000 = 200 pts), on every service. Admin reward catalogue (free wash / any free service / flat ₹ off, points needed, validity). Customers redeem into vouchers and use them while booking; admin can mark used or cancel (points refunded). |
| 6 | Cancel / reschedule | On every booking card and the home screen: Cancel (with reason) and Reschedule (date + slot picker). Cut-off and max reschedules are settings (`booking_cancel_cutoff_hours`, `booking_reschedule_cutoff_hours`, `booking_max_reschedules`). Slot counts, free washes, package credit and vouchers are restored on cancel. Admin can do the same from Customer Bookings. |
| 7 | OTP + WhatsApp A–Z | Single messaging layer: WhatsApp Cloud API with SMS fallback. Templates for OTP, booking received/confirmed/rescheduled/cancelled, day-before reminder, job pipeline stages, service completed, invoice, warranty issued/expiring, points earned, reward redeemed, birthday/anniversary, payment, pickup, delivery. Delivery receipts update message status. |
| 8 | Day-before reminder + auto-bot | Reminder 12–36 h before the slot (9 AM–8 PM only) asking YES / NO / RESCHEDULE. Bot confirms, cancels or sends a reschedule link automatically, answers "status" and "price" questions (with the customer's own car price), escalates complaints, and files every message into a categorised inbox (Confirmed / Cancelled / Reschedule / Complaints / Status / Pricing …). |
| 9 | Birthday & anniversary | Optional DOB, anniversary and profile photo for customers (also shown on Admin → Customer details). Daily 9 AM wish with a personal single-use coupon. New admin module **Birthday & Anniversary**: upcoming dates, default messages, per-customer custom message & offer, send now, sent log. |
| 10 | Gender + saved addresses | Gender and at least one address are required on first login (onboarding screen). Blinkit-style address book: Home / Work / Other, use current location, default address. |
| 11 | AI concierge | Dashboard banner removed; the concierge is a floating chat bubble on the side. |
| 12 | White-background cars & products | 185 hand-checked real car photos covering 264 models (Wikimedia), background removed onto pure white, stored locally (`client/public/cars/library`, ~10 MB), mostly red/black paint. Photos that were blurry, outdated, had extra cars or people, or showed the wrong generation were removed; those models show a clean white placeholder. Products cut out of the dark mock-ups onto white (`client/public/products/white`). |
| 13 | Hoora-style UI | New mobile customer app: photo hero with location + vehicle chip, category tiles, popular services, bottom tab bar, bottom sheets; redesigned Services, Bookings, Rewards (refer & earn), Profile, Store, Garage, Service history, Login. Admin shell updated to match, plus mobile-friendly new admin pages. |

## 3b. Staff & admin apps — same look as the customer app

| Area | What changed |
|---|---|
| Staff app | New light header (greeting, live attendance chip, profile sheet) and the customer-style white tab bar. Jobs, Check-in, Stock, Delivery, Inquiry and Benefits screens redesigned as mobile cards with hero, stat tiles, chips and big tap targets. Same data and actions as before. |
| Admin shell | Light header with search/alerts/profile as bottom sheets; white tab bar (Home · Bookings · **+** · Jobs · All apps). "+" opens quick actions; "All apps" is a Hoora-style icon grid with search. |
| Admin home | Rebuilt: today's & month revenue hero, quick-action grid, 9 real KPI tiles, bookings waiting for approval, packages ending soon, studio card, and a workshop list where status can be changed from a sheet. |
| All other admin pages | Shared parts restyled once so every page follows: page header (back arrow, big title, scrollable actions), number tiles (2 per row on phones), buttons, inputs, selects, filter chips, and pop-ups (now slide up from the bottom on phones). Older cards, tables and labels pick up the app style automatically. All 43 admin pages checked at phone width — nothing runs off the screen. |

Bugs fixed during this pass:
- **Admin dashboard showed made-up job cards** (e.g. a BMW for "Geetanshu Goyal", ₹52,340) whenever there were none, and filled missing values with fake ones (₹25,000, "Rohit Sharma"). It now shows only real data.
- Customers page showed an invented "Studio Retention 94.2%" and a fake loyalty count; replaced with real *Birthdays this month* and *Joined this month*. Job Cards page showed a fake "↑ 12.5%".
- Number tiles drew a green "trending up" arrow next to plain captions; arrows now appear only for real percentages.
- Staff attendance chip always said "Clock in" (read the wrong field and compared dates in UTC).

## 3c. Phase 1 — busiest staff & admin screens rebuilt

| Screen | What changed |
|---|---|
| Job Card (opened from any job) | Car + customer header with Call / WhatsApp, big "Move to next stage" progress card, service cards with Edit / Remove, bill summary, one-tap camera button for before/after photos, sticky bottom bar (Submit · Complete & bill · Invoice · Share · Deliver). |
| Create job card | 3 steps: Car & customer → Pick services (photo tiles priced for that car type) → Review & create, with a sticky total + Continue bar. |
| Quick wash | Waiting / Washing / Ready / Released counters and tabs, one card per car with a big "Next" button and wash-phase bar; new wash is a slide-up sheet with tap-to-pick washes priced by car type. |
| Customer bookings | Tabs Needs OK · Today · Confirmed · Completed · Cancelled · All with real counts; each card shows date/time, service, payment, the customer's WhatsApp reply, Call / WhatsApp / History, and Approve · Reject · "Car arrived — create job card" · Reschedule · Cancel. |
| Quick billing | Shopping-style checkout: find customer, car type chips, tap services/products to add, cart with quantity buttons, discount, Cash/UPI/Card/Bank/Other, sticky "Create bill"; then a Done screen with Download/print, Send on WhatsApp, New bill. |
| Invoices | Quick date chips (Today / This week / This month / Last month). |
| Inventory, Accounts, Reports, Settings, Staff HR | Already had phone layouts; checked at phone width and fixed what was wrong (below). |

Server change (deploy with the rest): `GET /api/bookings` accepts `date=today` or `date=YYYY-MM-DD` and returns per-tab `counts`.

Bugs fixed in Phase 1:
- Add/edit service pop-up on a job card lost the cursor after every letter typed.
- New services on a job card, new job cards and quick bills always used the **sedan** price (quick bill could even show ₹0); they now use the car's own type.
- Staff who created a job card were sent to an admin-only page afterwards.
- Bookings page tiles counted only the 15 bookings on screen; tabs now show real totals.
- Accounts and Coupons showed "₹₹" (double rupee sign).
- Invoices page showed an invented "Fiscal Ledger Sync — Reconciled, 100% cloud synced" tile; replaced with a real count.

## 3d. Car pictures, brand logos, before/after, coating brands (Oct 20)

| Change | Details |
|---|---|
| Car pictures | No free API gives accurate photos for every Indian model (imagin.studio is accurate but paid). So: 18 wrong/outdated library photos removed (e.g. "DC Avanti" showed a Mercedes, "ICML Extreme" an Innova, "VW Ameo" a Passat); matching made strict ("Safari" no longer shows "Safari Storme"); any model without a verified photo now shows its **brand logo** instead of a random red sedan. |
| Brand logos | 43 logos from the free open-source car-logos-dataset (MIT) stored in `client/public/brands`. Used in the add-car picker, car chips and admin badges. Bike brands aren't in the dataset — they show a bike icon/initial. |
| Add vehicle | Hoora-style: choose 4-wheeler / 2-wheeler → logo grid (Popular + All brands, "Can't find it?") → model list with car type → number plate & year. |
| Before / after & process video | Every service detail shows "Before & after" (drag slider when both photos exist) and "See the process" (video or YouTube link). Empty slots show "coming soon". Add them in **Admin → Services → edit a service** (upload a file, or paste a link). File upload needs the `CLOUDINARY_*` keys in `server/.env`; pasted links work without them. |
| PPF & ceramic brands | Garware (PPF) and Astonish (ceramic) added. Shown on the customer home screen and on PPF / ceramic services. Manage (add, logo, warranty note, hide) in **Admin → Services → PPF & ceramic brands**. |
| "Book now" | Opens the booking page at the service you tapped (pinned, selected and scrolled into view). Tapping a service on the home screen now always opens it — before, a slow load dropped it. |

Fixed along the way: a customer could change their car's type (e.g. SUV → hatchback) when editing it and pay the cheaper price — the server now decides the type; editing a car without resending brand/model erased them; deleting a service video left it set as the service's main video.

## 3e. WhatsApp messages — full customer journey (Oct 22)

| Moment | Message (template) | When |
|---|---|---|
| Booking made / confirmed | BOOKING_RECEIVED, BOOKING_CONFIRMED | instantly |
| Rescheduled / cancelled | BOOKING_RESCHEDULED, BOOKING_CANCELLED, BOOKING_CANCELLED_CUSTOMER | instantly |
| Day before | BOOKING_REMINDER (reply YES / NO / RESCHEDULE) | 12–36 h before, 9 AM–8 PM |
| **Morning of the booking** *(new)* | BOOKING_MORNING_REMINDER — time, studio address, map link | 8 AM on the day |
| Job card started | SERVICE_STARTED — now lists the services, a real "ready by" time from service durations, and the live tracking link (was always "2 hours") | when the job card is submitted |
| Job card finished | SERVICE_COMPLETED — now with the bill amount and tracking link | when completed |
| Package start | PACKAGE_APPROVED — validity dates (was hard-coded text, now editable) | on activation |
| Package renewed | PACKAGE_RENEWED *(new, editable)* | on renewal |
| Package expiry | PACKAGE_EXPIRY_REMINDER 7 days and 1 day before; **PACKAGE_EXPIRED** on the day *(new)* | 11 AM / 10 AM |
| **Next package wash due** *(new)* | PACKAGE_NEXT_WASH — washes left + book link | 10 AM, when 15 days passed since the last visit, washes are left and nothing is booked (once per 15 days) |
| **Festival offers** *(new)* | FESTIVAL_OFFER — Admin → All apps → **Festival Offers**: 12 festival presets, own text, optional coupon, audience (all / recent / inactive / package members), send now or schedule | at the chosen time |

All wording is editable in Admin → WhatsApp. Offer-type messages skip customers who opted out. For the live WhatsApp API, each template needs Meta approval (marketing category for festival / next-wash / expired).

## 4. Bugs found and fixed along the way

- WhatsApp template edits were never saved (wrong field name), the edit box opened empty, and "Send test" called a missing endpoint.
- Settings and loyalty settings could not be saved on databases where `key_name` is a generated column.
- Job card pipeline / live tracker links were not signed — anyone could change the number in the link. Tracker links now carry a signed token.
- First-wash discount jobs earned no loyalty points; they now earn on the amount actually paid.
- Admin dashboard showed made-up numbers (1,284 job cards, 124 pending, "↑ 12.5% vs last month"…) whenever a value was missing. It now shows only real figures.
- Inventory filters: picking a stock status ignored category/brand, and brand only matched exact names.
- When an admin assigned a delivery to a driver, the admin was saved as the driver (the driver never saw it).
- Package and booking-advance payments were charged at whatever amount the browser sent; the server now prices them.
- Live OTP codes were written to the production server log; now masked in production.
- Database connections now always run in IST, so reminders and expiry jobs fire at the right time even if the server is in UTC.
- The login page showed a "1-click demo login" panel with demo numbers; it now appears only in local development.

## 5. Where things are

- Backend: `server/src/services/` (`whatsappProvider.js`, `messagingService.js`, `whatsappBot.js`, `bookingActions.js`, `automationJobs.js`, `jobStages.js`), new controllers `customerProfileController.js`, `greetingsController.js`, `publicTrackingController.js`.
- Frontend: `client/src/components/customer/` (app UI kit, sheets, live map), customer pages in `client/src/pages/customer/`, admin `GreetingsPage.tsx`, `components/admin/WhatsAppInboxPanel.tsx`, `LoyaltyRewardsAdmin.tsx`, `JobStagePanel.tsx`.

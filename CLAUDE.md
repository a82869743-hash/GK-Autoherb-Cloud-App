# GK AutoHerb — project context for Claude (read first)

Owner: Aryan (GK AutoHerb car-detailing studio, Vadodara). Writes in Hinglish, wants launch-ready
work and short progress updates. Full change log + deploy steps: `MOBILE_APP_UPDATE.md`.

## Stack & layout
- `client/` React 18 + Vite + TS + Tailwind + react-query + zustand. Customer app is Hoora-style
  (red/black, mobile-first). Staff and admin apps share the same look (`components/ops/ui.tsx`,
  `.ops-app` CSS layer in `index.css`).
- `server/` Express + MySQL (mysql2), socket.io, node-cron (IST). Messaging: `services/messagingService.js`
  (WhatsApp Cloud API with queued click-to-chat fallback + SMS), templates in `v2_whatsapp_templates`.
- Migrations: run single files with `node scripts/run_migration_files.js <file>` — never replay all.
  Latest: 087 (mobile app), 088 (service media roles + PPF/ceramic brands), 089 (WhatsApp journey),
  090 (package EMI, see `services/packageEmi.js`), 091 (service offers/discounts), 092 (in-app inbox +
  web push, `services/appNotify.js`; VAPID keys in server `.env`).
- Local test run (no real SMS): in `server/`: `MSG91_AUTH_KEY= TWO_FACTOR_API_KEY= MESSAGES_ENABLED=false node src/app.js`.
  Client: `npm run dev` in `client/` (port 5173, proxies /api to 5000).
- Local DB schema differs a lot from live (extra legacy tables, generated settings columns).

## Live server (gkautobook.cloud) — Hostinger VPS, Ubuntu 22.04
- API: `/root/app/server`, pm2 process `gk-backend`, port 5000. NEVER overwrite its `.env` or `uploads/`.
- Website: build `client/` with the server's `client/.env` (`VITE_API_URL=https://gkautobook.cloud/api`)
  and copy `dist/` into `/var/www/gkauto` (nginx root, owner www-data).
- Access: SSH key only — password SSH is disabled (`/etc/ssh/sshd_config.d/00-gk-hardening.conf`).
  App DB user is `gk_app`; MySQL root creds only in `/root/.my.cnf`. Daily DB backup 3:15 AM →
  `/root/backups/daily` (14 days, `/etc/cron.d/gk-db-backup`). A new computer needs its own key
  added to `/root/.ssh/authorized_keys` by Aryan (see `../ADD-DEPLOY-KEY.bat` for the pattern).
- Live DB `gk_autoherb` is small and older-shaped; contains zero dates, so ALTERs need
  `SET SESSION sql_mode=''` (already in 087).
- Rules from Aryan: no sample/test/mock data on live, nothing deleted, back up before every change.
  Safe deploy: backup (`mysqldump` + tar to `/root/backups/`) → rehearse migrations on a copy of the
  live dump → strip sample-data INSERTs → compare row counts → stage → build → swap → pm2 restart → verify.
- Backups: `/root/backups/gk-before-deploy-20261022-023836`, `/root/backups/gk-before-fixes-20261022-030939`
  (+ DB copies in `Software (1)/deploy-backups/`).

## Done (Oct 2026)
All 13 original requests (unique service images, live GPS fix, car-type pricing, filters, loyalty 10%,
cancel/reschedule, WhatsApp/OTP, reminders + YES/NO bot, birthday/anniversary, gender + addresses,
side chatbot, white-bg car/product images, Hoora UI); staff + admin redesign; Phase 1 screens (job card,
create job, quick wash, bookings, quick bill, invoices); brand logos (car-logos-dataset) + add-vehicle
logo picker; before/after + process-video slots; PPF/ceramic brands (Garware, Astonish); full WhatsApp
journey (morning reminder, package start/renew/expired/next-wash, festival offers page); deployed live
22 Oct with migrations 086(safe)/087(safe)/088/089 + backfill; live bug fixes (quick-wash walk-in,
chatbot context, bulk messages, package sync, package consume). 27 Oct: package EMI (studio installments,
admin sets months per package) with migration 090. Backup before it: `/root/backups/gk-before-emi-20261027-180649`.
28-30 Oct: security lockdown, audit fixes, service offers (091), studio-location fix, login OTP via 2Factor
OTP route, in-app notifications + free phone push for every message (092).

## Open items
1. SMS: 2Factor rejects all non-OTP SMS (needs DLT templates) — Aryan to register, or connect Meta WhatsApp API
   (`WHATSAPP_*` env vars, templates need Meta approval). OTP login SMS works.
2. Payments: live server has NO Razorpay keys → since 28 Oct online pay is refused in production
   ("pay by UPI QR or at the studio"); mock/sandbox only works with NODE_ENV≠production. Add
   `RAZORPAY_KEY_ID/SECRET` (server) + `VITE_RAZORPAY_KEY_ID` (client .env) and rebuild.
   `RAZORPAY_WEBHOOK_SECRET` is already set on live (paste it into the Razorpay webhook settings).
3. Cloudinary keys empty locally (uploads of before/after media need them; pasted links work).
4. Chatbot FAQ rows (Admin → AI Bot) still say "1 point per ₹100" — Aryan to edit.
5. Suggested next: real-phone end-to-end test; admin Customer detail page redesign; PWA install.

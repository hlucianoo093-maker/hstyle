# Old Gold Barber Studio

A responsive barber salon website with a simple 4-step appointment booking flow and an admin dashboard for managing appointments, services, barbers, and scheduling.

## Features
- Premium dark-and-gold salon design
- Responsive homepage with services, reviews, contact details, and barber profile cards
- 4-step booking flow: service → barber → date/time → customer details
- Real booking availability using SQLite storage and overlap protection
- Admin login and dashboard to confirm or cancel bookings
- Salon-owner workspace with sidebar pages for overview, appointments, services, barbers, and schedule
- Business settings for salon/barber themes, business name and logo URL, language/region, and currency
- North Macedonia/Kosovo location settings with a single corresponding currency (MKD/EUR)
- Macedonian and Albanian website translations, with owner-selectable enabled languages and default language
- Service bundles that clients can select and book as one appointment
- Business Google review, Facebook, and Instagram links in the public footer
- Owner-provisioned employee logins with a private view of each employee's assigned appointments
- Installable administrator and employee PWAs with mobile app-style navigation
- Appointment search/date filters and an at-a-glance salon overview
- Add/edit/remove services and barbers
- Set working hours and block unavailable dates

## Free deployment with Neon and Render
1. Create a Neon project and copy its pooled PostgreSQL connection string.
2. Create a Render Web Service from the GitHub repository `hlucianoo093-maker/hstyle`, branch `main`. The included `render.yaml` uses `npm ci` and `npm start` on the free plan.
3. Set `DATABASE_URL` to the Neon connection string and `ADMIN_PASSWORD` to a long, unique password in Render's environment settings. `NODE_ENV` is set to `production` by the blueprint.
4. To carry over the local SQLite data, copy `.env.example` to `.env`, set `DATABASE_URL` to the same Neon connection string, then run `npm run db:migrate-sqlite` before accepting live bookings. The importer refuses to run if Neon already has appointments. Employee sessions are intentionally not migrated, so employees sign in again.

The app uses local SQLite for development when `DATABASE_URL` is absent, and Neon PostgreSQL when it is present. Never commit `.env` or share the Neon connection string. Keep the Render and Neon regions close to reduce latency.

## Deploying to Vercel
1. Create a Neon project and copy its pooled PostgreSQL connection string. Vercel's filesystem is ephemeral, so production must use PostgreSQL rather than the local SQLite database.
2. Import this repository into Vercel, or deploy it with the Vercel CLI. Vercel detects the exported Express app in `server.js` and runs it as a serverless function.
3. Add `DATABASE_URL` and a long, unique `ADMIN_PASSWORD` as Vercel environment variables for Production. Set `NODE_ENV` to `production`, then deploy.
4. To carry over local SQLite data, configure `DATABASE_URL` in a local `.env` file and run `npm run db:migrate-sqlite` before accepting live bookings. The importer refuses to run if Neon already has appointments. Employee sessions are intentionally not migrated, so employees sign in again.

Never commit `.env` or share the Neon connection string. Keep the Vercel and Neon regions close to reduce latency.

## Run locally
1. Install dependencies:
   npm install
2. Start the app:
   npm start
3. Open the site:
   http://localhost:3000/
   Direct booking page: http://localhost:3000/booking
   Barber landing page: http://localhost:3000/barber
   Salon landing page: http://localhost:3000/salon
   Employee portal: http://localhost:3000/employee
4. Open the admin panel:
   http://localhost:3000/admin

## Admin access
- Password: admin123

## Notes
The app stores booking data, bundles, employee access, and business settings in the `data/salon.db` SQLite file and creates seed data automatically when it first runs. The home page selects the Salon or Barber landing page according to the saved business type; both pages are also available directly at `/salon` and `/barber`. In Business settings, choose North Macedonia (MKD) or Kosovo (EUR), enable Macedonian and/or Albanian, and choose a default language. This country/currency selection changes the displayed denomination and does not apply exchange-rate conversion.

Owners can create a bundle from existing services at a fixed package price; clients book the package through the same appointment flow. Employee accounts are created by the owner from the Team page and are linked to one team member. Employees sign in at `/employee` to view only their assigned bookings. Use the Business settings page to add public Google review and Facebook/Instagram links; unset links are omitted from the footer. Logo and social URLs must be publicly accessible HTTP/HTTPS URLs.

The admin portal (`/admin`) and employee portal (`/employee`) can be installed as separate PWAs from a supported browser's install button/menu. PWA installation requires HTTPS in production (localhost is supported for development). The service worker caches only the app shell; API responses and appointment data are never cached.

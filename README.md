# Aurawell

**Care coordination, simplified** — one appointment ledger, two purpose-built views: a patient portal and a doctor console.

This is the standalone full-stack app behind the [in-browser demo](https://portfoliowassim.vercel.app/demo/aurawell) on my [portfolio](https://portfoliowassim.vercel.app). The portfolio demo simulates the backend client-side for instant, zero-setup interaction; this repo is the real thing — a Node/Express API over PostgreSQL, with role-based JWT authentication.

## Features

- 🔐 JWT authentication with a `role` claim (`patient` / `doctor`)
- 📅 Patients book appointments; doctors see everyone booked with them
- 🚫 Double-booking is impossible by construction — `(doctorId, date, time)` is a DB-level unique constraint, not just a UI check
- ❌ Patients can cancel their own upcoming visits
- Seeded demo patient and doctor so the app works out of the box

## Architecture

```
React + Vite ──/api──► Express (JWT + role claim) ──► Prisma ──► PostgreSQL
   Patient and doctor dashboards are different queries over one Appointment table
```

## API

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Exchange email + password for a JWT |
| `GET` | `/api/doctors` | List doctors and specialties |
| `GET` | `/api/appointments` | List the caller's appointments (patient) or booked-with-them (doctor) |
| `POST` | `/api/appointments` | Book an appointment (patients only; 409 if the slot is taken) |
| `PATCH` | `/api/appointments/:id/cancel` | Cancel your own upcoming appointment |

All routes except `/api/auth/login` require `Authorization: Bearer <token>`.

## Run it

```bash
docker compose up --build
```

- App: http://localhost:5173
- API: http://localhost:4400/api/health

Demo logins (both use `demo1234`):
- `patient@aurawell.app` — patient portal
- `doctor@aurawell.app` — doctor console

### Without Docker

```bash
# API
cd api && cp ../.env.example .env && npm install && npm run db:push && npm run seed && npm run dev

# Web (separate terminal)
cd web && npm install && npm run dev
```

## Tech stack

React · Vite · Express · Prisma · PostgreSQL · JWT · Docker

## License

MIT — see [LICENSE](./LICENSE).

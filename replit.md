# Dr. Iqbal Kharal — Neurosurgeon

A patient-facing website for Dr. Iqbal Kharal at Neuro Tower Multan, with clinic information, care areas, patient reviews, and appointment requests.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/web/src/pages/home.tsx` — patient-facing doctor profile and appointment experience
- `artifacts/web/src/index.css` — shared visual theme and responsive styles
- `lib/api-spec/openapi.yaml` — source of truth for appointment API contracts
- `lib/db/src/schema/appointments.ts` — appointment request database model
- `artifacts/api-server/src/routes/appointments.ts` — availability and appointment request routes

## Architecture decisions

- Appointment requests are stored in the shared PostgreSQL database so they persist across refreshes and sessions.
- Clinic availability is served through the API so the booking form and future staff tools share one source of truth.
- The public booking flow creates a request rather than confirming a slot automatically; clinic staff can confirm it after reviewing the request.

## Product

- Introduces Dr. Iqbal Kharal and his brain and spine care focus.
- Shares Neuro Tower Multan location, phone number, clinic hours, services, and patient voices.
- Lets patients request new consultations, follow-ups, second opinions, and spine consultations.

## User preferences

- Keep the experience professional, reassuring, and easy for patients to act on.

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after changing the OpenAPI contract.
- OpenAPI integer schemas currently generate `zod.int()`, which is incompatible with this workspace's Zod 3 runtime; use numeric schemas for generated API IDs unless the Zod setup changes.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

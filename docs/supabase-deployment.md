# Supabase deployment

TaskFlow uses Supabase Auth, PostgreSQL, and private Supabase Storage while keeping its Express/tRPC server as a separate Node service. GitHub Pages hosts only the static frontend.

## Supabase setup

1. Create a Supabase project and configure Auth email sign-in. Configure the Auth site URL and allowed callback URL for the deployed frontend, for example `https://tanphap.github.io/taskflow-planner/`. Configure SMTP before relying on email magic links in production.
2. Set the Supabase database connection string as `DATABASE_URL`. Use the connection mode appropriate for the Node host and include SSL options from the Supabase dashboard.
3. Apply the initial PostgreSQL schema from the project root with `pnpm db:push` using the Supabase connection string. The migration enables RLS and adds owner policies; the API continues to access data through the server, not the browser.
4. Create a **private** Storage bucket named `taskflow-files`, or set `SUPABASE_STORAGE_BUCKET` to the bucket name you create.
5. Deploy the Node server from this repository with the backend variables below. Do not expose the service-role key to the browser.
6. Set the GitHub repository variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_API_BASE_URL` so the Pages build can connect to Supabase Auth and the separately hosted API.
7. Set the Pages source to GitHub Actions, merge the Pages workflow change into `main`, and verify the deployment workflow.

## Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Pages build | Supabase project URL used by the browser Auth client |
| `VITE_SUPABASE_ANON_KEY` | Pages build | Public Supabase key; RLS must remain enabled |
| `VITE_API_BASE_URL` | Pages build | Origin of the deployed Node API, without `/api/trpc` |
| `SUPABASE_URL` | Node server | Supabase project URL used to validate Auth sessions |
| `SUPABASE_ANON_KEY` | Node server | Public key used by the server to verify user access tokens |
| `SUPABASE_SERVICE_ROLE_KEY` | Node server secret | Server-only key used for private Storage operations |
| `DATABASE_URL` | Node server and migration command | PostgreSQL connection string |
| `SUPABASE_STORAGE_BUCKET` | Node server (optional) | Private Storage bucket; defaults to `taskflow-files` |
| `TASKFLOW_FRONTEND_URL` | Node server | Allowed browser origin, e.g. `https://tanphap.github.io` |
| `OWNER_OPEN_ID` | Node server (optional) | Supabase Auth user UUID assigned the application admin role |
| `TASKFLOW_PUBLIC_URL` | Node server | Public app URL used by existing email OAuth callbacks |

Keep the existing integration configuration for email IMAP/OAuth, Gemini, Telegram, timesheets, and token encryption where those features are used.

The existing Forge Heartbeat scheduler and several Manus-backed AI/map/voice integrations are not replaced by this migration. Keep `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY` configured for those features; replacing scheduled jobs with a Supabase-native or Node-hosted scheduler is a separate follow-up.

## Existing data

The generated migration creates the PostgreSQL schema for a new Supabase database; it does not copy records from the existing MySQL database. Before cutover, export and import the MySQL data, preserve each application user ID used by related rows, and map each account to its Supabase Auth UUID in `users.openId`. Do not point production traffic at an empty database if existing TaskFlow data must be retained. The migration requires access to the source database and Supabase project, neither of which is stored in this repository.

The Node server remains necessary for tRPC, IMAP, scheduled integrations, and server-only secrets. GitHub Pages alone cannot run those backend features.

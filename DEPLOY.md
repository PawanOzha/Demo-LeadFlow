# Deploying LeadFlow (Railway + Supabase)

## Build succeeded but service shows “Crashed”

The **build** can pass while the **runtime** still fails (wrong `start` command, missing env, or process exits immediately).

1. Open **Railway → your service → Deployments → latest** and switch to **Deploy logs** (not only Build logs). The crash reason is printed when **`npm start`** runs.
2. Confirm **Variables** include **`DATABASE_URL`** (Supabase `postgresql://...` on port **5432**) and Supabase API keys. An empty `DATABASE_URL` causes the app to exit on startup.
3. Set **Healthcheck path** to **`/api/health`** (Settings → Healthcheck) so Railway probes a route that does not touch the database.

## “Application failed to respond” (Railway)

Usually the container **never became healthy** in time: the process crashed on startup, or the HTTP server started too slowly.

1. Open **Railway → your service → Deployments → latest → Logs** (Build **and** Deploy) and read the first error.
2. **`DATABASE_URL`** must be set for **both** build and runtime (Prisma runs `migrate deploy` in **`postbuild`** after `next build`). If it is missing at build time, the deploy can fail or the DB schema may be out of date.
3. Use a **Supabase Postgres** URI on port **5432** (direct connection). If the connection fails, append **`?sslmode=require`** to the URL.
4. Do **not** use `file:...` (SQLite) on Railway — set `DATABASE_URL` to `postgresql://...` only.

## Fix: Prisma / SQLite error 14

That means the server was using **`DATABASE_URL=file:...`**. SQLite paths **do not work** on Railway for app data.

### Configure

1. **Supabase** → **Settings** → **Database** → copy the **URI** (port **5432**).  
   Example: `postgresql://postgres.[password]@db.[project-ref].supabase.co:5432/postgres`

2. **Railway** → service → **Variables**:
   - **`DATABASE_URL`** = that `postgresql://...` string (URL-encode special characters in the password if needed).
   - Remove values like `file:./prisma/dev.db`.

3. **Supabase** → **Settings** → **API**: set **`NEXT_PUBLIC_SUPABASE_URL`**, **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**, **`SUPABASE_SERVICE_ROLE_KEY`** in Railway.

4. **Redeploy** so a full **build** runs (migrations apply in `postbuild`). The **`start`** command only runs a small Railway guard + `next start` so the server comes up quickly.

5. Optional: **`npx prisma db seed`** locally with the same `DATABASE_URL` if you want demo users/leads.

## Local QA without DB migrate on build

Root **`npm run qa`** sets **`SKIP_POSTBUILD_MIGRATE=true`** so `next build` does not require a reachable database. Production builds on Railway should **not** set this variable.

The app uses **PostgreSQL** for Prisma; **Supabase Auth** is separate (same Supabase project).

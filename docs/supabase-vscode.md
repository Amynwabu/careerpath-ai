# Connect Supabase in VS Code

1. In Supabase, open Project Settings -> Database -> Connection string -> URI.
2. Copy `.env.example` to `.env`.
3. Replace `DATABASE_URL` with your Supabase pooled Postgres URI.
4. In VS Code, reload the window so recommended extensions activate.
5. Open SQLTools, create a PostgreSQL connection, and paste the same database details from the Supabase URI.
6. To run the backend with Supabase, use Run and Debug -> `CareerPath API (Supabase)`.
7. To push the Drizzle schema, run the VS Code task `db: push schema to Supabase` after exporting `DATABASE_URL` in the terminal.

Keep `.env` private. It is ignored by Git.

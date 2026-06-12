# Local PostgreSQL Backend

This workspace has a project-local PostgreSQL database for CareerPath AI.

- Runtime: `%LOCALAPPDATA%\Programs\postgresql-17.10-tar\pgsql`
- Data directory: `.local-postgres/data`
- Log file: `.local-postgres/postgres.log`
- Host: `localhost`
- Port: `5433`
- User: `careerpath`
- Database: `careerpath_ai`
- Connection string: `postgresql://careerpath@localhost:5433/careerpath_ai`

Useful VS Code tasks:

- `db: start local PostgreSQL`
- `db: stop local PostgreSQL`
- `db: list local tables`
- `api: build`

The backend reads `DATABASE_URL` from `.env`.

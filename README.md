# Pantry

Pantry is a household inventory app with a React/TanStack frontend and an ASP.NET Core API using Entity Framework Core, Identity, and SQLite.

## Self-host with Docker

Docker Compose runs the frontend, API, and SQLite database together. The web app and API are available through one address; SQLite is stored in the persistent `pantry-data` Docker volume.

### Requirements

- Docker Engine with the Compose plugin, or Docker Desktop

### Start

1. Copy `.env.example` to `.env`.
2. Replace `JWT_KEY` in `.env` with a unique random secret of at least 32 bytes. For example, generate one with PowerShell:

   ```powershell
   [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
   ```

   Or with OpenSSL:

   ```sh
   openssl rand -base64 48
   ```

3. From the repository root, build and start the stack:

   ```sh
   docker compose up --build -d
   ```

4. Open `http://localhost:8080` (or the port configured by `APP_PORT` in `.env`).

The API applies database migrations and seeds its initial settings and roles when it starts. The first account registered becomes the administrator.

To stop the app while retaining its database, run `docker compose down`. The named volume `pantry-data` survives container rebuilds and restarts. To permanently delete the database as well, run `docker compose down --volumes`. Back up the `pantry-data` Docker volume regularly. For an internet-facing deployment, put the app behind a TLS-terminating reverse proxy and use a strong, private `JWT_KEY`.

## Run locally in VS Code

### Prerequisites

- VS Code with the C# extension
- Node.js 20.19+ or 22.12+ and npm
- .NET 10 SDK

### Start the app

1. Open the repository folder in VS Code.
2. Open **Run and Debug** (`Ctrl+Shift+D`), select **Run Pantry (full stack)**, and press **F5**.
3. VS Code builds and launches the API, installs frontend dependencies, and starts the frontend in the integrated browser.

The frontend opens automatically in VS Code's Integrated Browser when the dev server is ready. This uses VS Code's `openIntegratedBrowser` server-ready action and requires a VS Code version that supports the Integrated Browser.

The API listens at `http://localhost:5050`. It creates `backend/App_Data/pantry.db`, applies EF Core migrations, and seeds default settings and roles on first run. The first account registered becomes the administrator.

The JWT signing key in `.vscode/launch.json` is for local development only. Do not reuse it outside local development. Back up `backend/App_Data/pantry.db` to preserve local data.

The SQLite database is created fresh; existing PostgreSQL data is not migrated.

To stop the app, stop the compound debug session in VS Code. The SQLite database remains in `backend/App_Data/`.

### Run pieces independently

VS Code tasks are available from **Terminal > Run Task**:

- **Install frontend dependencies**
- **Build API**

From the `frontend/` folder, you can run `npm install` then `npm run dev` and `npm run dev:api` in separate terminals. No database server or container is required.

## Project structure

- `frontend/src/routes/` — TanStack file-based routes
- `frontend/src/features/` — authentication and pantry features
- `frontend/src/shared/` — shared API client, utilities, and UI
- `frontend/public/` — static files served as-is
- `frontend/` — frontend package manifest, Vite, TypeScript, lint, and Docker configuration
- `backend/` — ASP.NET API, EF Core models, migrations, and the local SQLite database
- `deploy/` — reverse-proxy configuration used by Docker Compose

## Useful commands

```sh
cd frontend
npm install
npm run dev
npm run build
npm run lint
npm run build:api
```

# Pantry

Pantry is a household inventory app with a React/TanStack frontend and an ASP.NET Core API using Entity Framework Core, Identity, and PostgreSQL.

## Run locally in VS Code

### Prerequisites

- VS Code with the C# extension
- Node.js 20.19+ or 22.12+ and npm
- .NET 10 SDK
- Docker Desktop with Docker Compose

### Start the app

1. Open the repository folder in VS Code.
2. Start Docker Desktop.
3. Open **Run and Debug** (`Ctrl+Shift+D`), select **Run Pantry (full stack)**, and press **F5**.
4. VS Code starts PostgreSQL, builds and launches the API, installs frontend dependencies, and starts the frontend.
5. Open [http://localhost:5173](http://localhost:5173).

The API listens at `http://localhost:5050`. On its first run, it applies EF Core migrations and seeds default settings and roles. The first account registered becomes the administrator.

The local database credentials and JWT signing key in `.vscode/launch.json` are development-only values for the loopback development setup. Do not reuse them outside local development.

To stop the app, stop the compound debug session in VS Code. PostgreSQL remains running in Docker. Stop it from a terminal with `docker compose down`; to also delete local database data, use `docker compose down --volumes`.

### Run pieces independently

VS Code tasks are available from **Terminal > Run Task**:

- **Start local PostgreSQL**
- **Install frontend dependencies**
- **Build API**
- **Prepare API**

You can also run `npm run dev` and `npm run dev:api` in separate terminals after starting PostgreSQL and installing dependencies.

## Project structure

- `src/routes/` — TanStack file-based routes
- `src/features/` — authentication and pantry features
- `src/shared/` — shared API client, utilities, and UI
- `public/` — static files served as-is
- `backend/` — ASP.NET API, EF Core models, and migrations

## Useful commands

```sh
npm install
npm run dev
npm run build
npm run lint
npm run build:api
```

# Pantry

Pantry is a household inventory app with a React/TanStack frontend and an ASP.NET Core API using Entity Framework Core, Identity, and SQLite.

## Run locally in VS Code

### Prerequisites

- VS Code with the C# extension
- Node.js 20.19+ or 22.12+ and npm
- .NET 10 SDK

### Start the app

1. Open the repository folder in VS Code.
2. Open **Run and Debug** (`Ctrl+Shift+D`), select **Run Pantry (full stack)**, and press **F5**.
3. VS Code builds and launches the API, installs frontend dependencies, and starts the frontend.
4. Open [http://localhost:5173](http://localhost:5173).

The API listens at `http://localhost:5050`. It creates `backend/App_Data/pantry.db`, applies EF Core migrations, and seeds default settings and roles on first run. The first account registered becomes the administrator.

The JWT signing key in `.vscode/launch.json` is for local development only. Do not reuse it outside local development. Back up `backend/App_Data/pantry.db` to preserve local data.

The SQLite database is created fresh; existing PostgreSQL data is not migrated.

To stop the app, stop the compound debug session in VS Code. The SQLite database remains in `backend/App_Data/`.

### Run pieces independently

VS Code tasks are available from **Terminal > Run Task**:

- **Install frontend dependencies**
- **Build API**

You can also run `npm run dev` and `npm run dev:api` in separate terminals. No database server or container is required.

## Project structure

- `src/routes/` — TanStack file-based routes
- `src/features/` — authentication and pantry features
- `src/shared/` — shared API client, utilities, and UI
- `public/` — static files served as-is
- `backend/` — ASP.NET API, EF Core models, migrations, and the local SQLite database

## Useful commands

```sh
npm install
npm run dev
npm run build
npm run lint
npm run build:api
```

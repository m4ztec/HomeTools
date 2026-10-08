# Pantry

Pantry is a shared household inventory app. The frontend is React/TanStack Start; its API, authentication, and persistence are provided by ASP.NET Core, ASP.NET Core Identity, and EF Core with PostgreSQL.

## Project structure

- `src/routes/` — TanStack file-based routes and route-level composition
- `src/features/auth/` — sign-in, session, and profile functionality
- `src/features/pantry/` — inventory models, API, queries, and pantry components
- `src/shared/` — cross-feature API client, utilities, and UI primitives
- `backend/Controllers/`, `Contracts/`, `Data/`, `Models/`, and `Services/` — ASP.NET API layers; EF migrations live under `Data/Migrations/`

## Requirements

- Node.js 20+
- .NET 10 SDK
- PostgreSQL 14+

## Run locally

1. Create an empty PostgreSQL database (for example, `pantry`).
2. Configure the API secrets. From the repository root in PowerShell:

   ```powershell
   dotnet user-secrets init --project backend/Pantry.Api.csproj
   dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Database=pantry;Username=postgres;Password=<your-password>" --project backend/Pantry.Api.csproj
   $key = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
   dotnet user-secrets set "Jwt:Key" $key --project backend/Pantry.Api.csproj
   ```

3. Install frontend dependencies:

   ```powershell
   npm install
   ```

4. Start the API and frontend in separate terminals:

   ```powershell
   npm run dev:api
   ```

   ```powershell
   npm run dev
   ```

   The API listens on `http://localhost:5050`; the frontend defaults to that URL. Set `VITE_API_URL` when the API is hosted elsewhere. Add the deployed frontend origin to `AllowedOrigins` in `backend/appsettings.json`.

EF Core applies database migrations at API startup and seeds default settings and the built-in roles. The first account registered is made the administrator; subsequent accounts receive the regular user role. Account registration and sign-in use ASP.NET Core Identity, with 12-hour bearer tokens.

For a production frontend build, run `npm run build` and start the generated Node server with `npm start`. The API is deployed separately.

## Data migration

The API is configured for a **fresh PostgreSQL database** and creates its own `identity` and `pantry` schemas. Existing Supabase users and inventory are not imported. Supabase password credentials are not transferable to ASP.NET Core Identity, so users must register new accounts. Export any data that should be retained before switching over.

## Frontend

```sh
npm install
npm run dev
npm run lint
npm run build
```

The API can be built independently with `npm run build:api`.

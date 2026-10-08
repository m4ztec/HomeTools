FROM node:22-alpine AS frontend-build
WORKDIR /src/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-build
WORKDIR /src

COPY backend/Pantry.Api.csproj backend/
RUN dotnet restore backend/Pantry.Api.csproj

COPY backend/ backend/
RUN dotnet publish backend/Pantry.Api.csproj --configuration Release --output /app/publish --no-restore

FROM node:22-bookworm-slim AS node-runtime

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_HTTP_PORTS=8081 \
    NODE_ENV=production \
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=8080

RUN mkdir -p /app/App_Data && chown -R $APP_UID:$APP_UID /app
COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
COPY --from=backend-build --chown=$APP_UID:$APP_UID /app/publish ./
COPY --from=frontend-build --chown=$APP_UID:$APP_UID /src/frontend/.output ./.output
COPY --chown=$APP_UID:$APP_UID deploy/entrypoint.mjs ./entrypoint.mjs

USER $APP_UID
EXPOSE 8080
CMD ["node", "entrypoint.mjs"]

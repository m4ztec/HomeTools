FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY backend/Pantry.Api.csproj backend/
RUN dotnet restore backend/Pantry.Api.csproj

COPY backend/ backend/
RUN dotnet publish backend/Pantry.Api.csproj --configuration Release --output /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_HTTP_PORTS=8080

RUN mkdir -p /app/App_Data && chown -R $APP_UID:$APP_UID /app
COPY --from=build --chown=$APP_UID:$APP_UID /app/publish .

USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "Pantry.Api.dll"]

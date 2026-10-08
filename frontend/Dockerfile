FROM node:22-alpine AS frontend-build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM node:22-alpine AS frontend
WORKDIR /app
ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000

COPY --from=frontend-build /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]

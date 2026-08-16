# Next.js frontend image (production build).
#
# NEXT_PUBLIC_* values are inlined at build time, so the API URL is a build
# argument rather than a runtime environment variable. Running the production
# build also activates the PWA service worker, which is disabled in dev.
FROM node:22-alpine

WORKDIR /app

# Dependencies first so this layer is cached across code changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]

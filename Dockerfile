# =============================================================================
# Runtime-only Dockerfile for GCP Cloud Run
# dist/ is pre-built by CI/CD pipeline — no Vite build happens here
# =============================================================================

FROM node:20-alpine

WORKDIR /app

# Install server-side dependencies only
COPY package-server.json package.json
RUN npm install --omit=dev --no-audit --no-fund

# Copy pre-built Vite output
COPY dist/ dist/

# A runtime-only source deploy depends on dist/ already containing Vite's
# build-time auth configuration. Fail the container build before it can ship a
# login page whose OAuth client is undefined.
RUN node --input-type=module -e "\
  import fs from 'node:fs';\
  import path from 'node:path';\
  const assetsDir = path.join(process.cwd(), 'dist', 'assets');\
  const jsFiles = fs.readdirSync(assetsDir).filter((file) => file.endsWith('.js'));\
  const hasAuthConfig = jsFiles.some((file) => /https:\\/\\/[a-z0-9-]+\\.supabase\\.co/.test(fs.readFileSync(path.join(assetsDir, file), 'utf8')));\
  if (!hasAuthConfig) {\
    console.error('Prebuilt dist/ is missing compiled Supabase auth config. Rebuild with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from GCP Secret Manager before deploying.');\
    process.exit(1);\
  }\
"

# Copy server and API routes
COPY server.js ./
COPY api/ api/

ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "server.js"]

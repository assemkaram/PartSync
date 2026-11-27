<!-- TEAM P02 | STEP P02-016 | Review this file, then remove this marker only. -->
# RIGPILOT — Architecture (1.2.1, separated client/server)

## Repository layout

```text
RIGPILOT-PC-Builder/
├── client/
│   ├── public/                 # Static catalogue, images, fonts and browser assets
│   ├── src/                    # React application, UI, state, services and domain logic
│   ├── index.html
│   ├── vite.config.js          # Proxies /api to the Node backend in development
│   ├── package.json            # Frontend dependencies and Vite/Vitest commands
│   ├── .env.example            # Public VITE_* variables only
│   └── vercel.json             # Static SPA fallback for frontend hosting
├── server/
│   ├── api/                    # Web Request/Response handlers for auth and AI
│   ├── lib/geminiProxy.js      # Gemini transport shared by API routes
│   ├── supabase/functions/    # Supabase Edge Functions (Deno)
│   ├── supabase/migrations/   # Database schema and RLS migrations
│   ├── scripts/               # QA, catalogue and maintenance tools
│   ├── test/                  # Node backend tests
│   ├── index.js                # Standalone Node HTTP API server
│   ├── package.json            # Backend-only runtime scripts
│   └── .env.example            # Server secrets; never expose to Vite
├── docs/                      # Technical documentation
├── dev.js                     # Starts client and server together
├── package.json               # Workspace-level commands
├── pnpm-workspace.yaml
└── pnpm-lock.yaml
```

## Client responsibilities

The client is a standalone React 18 + Vite SPA. All UI pages, components, browser state, compatibility calculations, catalogue presentation and user interactions live under `client/src`. Static catalogue JSON and browser assets are under `client/public`.

The client calls only the `/api` contract for backend features. `client/src/lib/apiBase.js` builds API URLs from `VITE_API_BASE_URL`; when the setting is empty, the browser calls same-origin `/api`. During local development Vite proxies `/api` to `http://127.0.0.1:3001`.

## Server responsibilities

`server/index.js` is the independent Node.js 22+ HTTP service. It routes:

- `GET /api/health` — process health and release metadata.
- `/api/auth/signup`, `/api/auth/login`, `/api/auth/health` — username/password account API.
- `/api/ai/*` — model config, usage quota checks and Gemini REST/SSE proxy.

The server uses Node's built-in `http` module and Web `Request`/`Response` handlers; no Express dependency is required. The AI handler streams upstream response bodies so streaming generation is not buffered.

The backend validates browser `Origin` against `CLIENT_ORIGIN` / `CLIENT_ORIGINS` and returns a matching CORS origin only for allowed client domains. It does not use a wildcard CORS policy.

## Environment separation

### `client/.env.local`

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` — public browser settings protected by RLS.
- `VITE_API_BASE_URL` — blank in local development; set the backend URL only when the API is hosted on another origin.
- `VITE_APP_URL` — optional canonical share URL.

### `server/.env`

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.
- `GEMINI_API_KEY` and optional `GEMINI_API_KEY_FALLBACK`.
- `AI_RATE_LIMIT_SALT`, `CLIENT_ORIGIN` / optional `CLIENT_ORIGINS`, `PORT`, `HOST`, `NODE_ENV`.

Node accepts legacy `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` only as migration fallbacks. New deployments use `sb_publishable_...` and `sb_secret_...`. Supabase Edge Functions receive the managed `SUPABASE_SECRET_KEYS` JSON map. Never send a secret key or Gemini key to the browser.

## Local workflow

From repository root:

```bash
pnpm install
# Copy client/.env.example -> client/.env.local
# Copy server/.env.example -> server/.env and fill server credentials
pnpm dev
```

The two processes run independently:

- Client: `http://localhost:5173`
- API: `http://localhost:3001`
- Health: `http://localhost:3001/api/health`

Run either one alone with `pnpm dev:client` or `pnpm dev:server`. The server can be started from its directory with `pnpm dev`; the client can be started from its directory with `pnpm dev`.

## Separate deployment

1. Deploy `client/` to a static frontend host (Vercel, Netlify or Cloudflare Pages). Set `VITE_API_BASE_URL` to the backend public URL at build time.
2. Deploy `server/` to a Node.js 22+ host (Render, Railway, VPS or equivalent) and start it with `pnpm start`.
3. Set `CLIENT_ORIGIN` on the backend to the exact frontend origin. For multiple hostnames use `CLIENT_ORIGINS` with comma-separated origins.
4. Configure the same Supabase project for browser and server envs; apply migrations from `server/supabase/migrations/`.

## Database and edge functions

Supabase Edge Functions are separate Deno functions, not part of the Vite client or Node API process. They live under `server/supabase/functions/`; schema migrations live under `server/supabase/migrations/`. Use Supabase CLI commands from the `server/` directory.

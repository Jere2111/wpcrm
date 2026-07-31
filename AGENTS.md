# Project Rules for AI Agents (Antigravity & AI Assistants)

## Tech Stack & Architecture
- **Framework**: Next.js 16 (App Router, Standalone mode, TypeScript)
- **Database & Auth**: Supabase (Postgres, RLS, Auth)
- **WhatsApp Integration**: Hybrid Strategy
  - **Meta Cloud API** (Default via `meta-api.ts`)
  - **Baileys WebSocket** (Optional sidecar via `baileys-engine.ts`)
- **AI Layer**: BYO-Key per-account (`AiService` supporting Google Gemini, OpenAI, Anthropic)

## Key Guidelines
1. **Never guess API parameters or schemas**: Inspect types in `src/types` and Supabase migrations in `supabase/migrations`.
2. **Preserve existing contracts**: Do not break RLS policies or existing endpoints (`/api/v1`, `/api/whatsapp/webhook`).
3. **Standalone Output**: Next.js uses `output: "standalone"` for Docker deployments.

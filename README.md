# Marshmallow

Marshmallow is a bring-your-own-key (BYOK) AI workspace that combines a modern Next.js 15 interface with a Convex backend so teams can chat with 300+ Claude, GPT, Gemini, and open-source models using their own OpenRouter or organisation keys. The platform supports rich file-grounded conversations, real-time usage analytics, and an admin control plane for governing model access, quotas, and costs.

## Highlights
- **Unified multi-model chat** – Stream reasoning-aware responses from OpenRouter while toggling between text-only, vision, and web-search enabled models per conversation.
- **Secure BYOK support** – Encrypt user-supplied keys with AES-256 (Convex actions) and fall back to system credentials only when policies allow it.
- **File & image context** – Upload PDFs and images into conversations, automatically convert attachments for OpenRouter consumption, and preview them inline.
- **Shareable conversations** – Publish read-only threads, clone them into an authenticated user workspace, and keep private attachments protected.
- **Deep usage telemetry** – Track token consumption, credits, request logs, and per-model spend with dashboards in both user settings and the admin portal.
- **Admin governance** – Curate the model catalog, manage feature flags (streaming, file upload, BYOK-required), view system alerts, and audit admin activity.

## Architecture
| Layer | Responsibilities | Key Packages |
|-------|------------------|--------------|
| **Next.js 15 (App Router)** | Client UI, chat experience, admin console, share pages | `next`, `react`, `tailwindcss`, `shadcn/ui`, `recharts` |
| **Convex** | Persistent data (users, conversations, messages, files), mutations/actions for chat, BYOK crypto, usage metrics | `convex`, `openai` (OpenRouter), `@ai-sdk/openai` |
| **Auth** | Clerk handles user authentication + admin gating | `@clerk/nextjs` |
| **External APIs** | OpenRouter for completions; Convex file storage for attachments; optional MCP/web search hooks | `openai`, Convex storage |

Core data entities live in [`convex/schema.ts`](convex/schema.ts) and cover users, conversations, messages, file attachments, model metadata, usage logs, and alerts.

## Getting Started

### Prerequisites
- Node.js 18+
- npm (or pnpm / bun)
- [Convex](https://docs.convex.dev/) CLI (`npm install -g convex`)
- Clerk application (for auth) with the Convex integration
- OpenRouter account & API key

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Create `.env.local` in the project root and provide:

```bash
NEXT_PUBLIC_CONVEX_URL= # Convex deployment URL
NEXT_PUBLIC_CLERK_FRONTEND_API_URL= # Clerk frontend API (e.g., https://...clerk.accounts.dev)
CLERK_SECRET_KEY= # Used by Next.js middleware/routes
OPENROUTER_API_KEY= # Default system key (optional if enforcing BYOK)
BYOK_ENCRYPTION_KEY= # 32-byte secret for AES-256 BYOK encryption
```

> Clerk requires additional keys for server-side rendering. Follow the [Clerk + Next.js quickstart](https://clerk.com/docs/nextjs/overview) to supply `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and related secrets if you expose server routes.

### 3. Initialise Convex
```bash
npx convex dev
```
This tails the Convex dev server and syncs schema + functions. On first run, push the schema when prompted.

### 4. Seed model catalog (optional)
Populate starter models via the provided script:
```bash
npx convex run seedModels:seedSampleModels
```

### 5. Run the Next.js dev server
```bash
npm run dev
```
Visit `http://localhost:3000` to open the Marshmallow workspace.

## Key Workflows

### Chatting with models
1. Sign in with Clerk.
2. Create a conversation from the sidebar (default model is Gemini Flash unless a user preference is stored).
3. Toggle models with the selector; BYOK-restricted models enforce encrypted key usage.
4. Drop PDFs/images into the chat – Convex storage hosts files and the OpenRouter action injects them into prompts.

### Bring Your Own Key (BYOK)
- Users opt in from **Settings → Model Preferences** to store an encrypted OpenRouter key (`convex/byok.ts` handles AES-256 encryption/decryption).
- Chat actions (`convex/chat.ts`) check model requirements and switch between system and user keys accordingly.

### Sharing & cloning conversations
- Enable sharing from the chat header to generate a public `shareId`.
- Public viewers can read via `/share/{shareId}`; authenticated users can clone threads without file attachments (`convex/conversations.ts`).

### Usage analytics & admin portal
- Users see BYOK vs system spend in **Settings → Usage Analytics** backed by `convex/usageTracking.ts`.
- Admins (Clerk role `admin`) access `/admin` to review metrics, request logs, model governance, and admin audit logs.

## Project Structure
```
src/
  app/              # Next.js routes (chat, share, admin, settings)
  components/       # UI components (chat, admin dashboards, magic UI)
  lib/              # Convex client setup
convex/
  schema.ts         # Convex data schema definitions
  *.ts              # Actions, queries, and mutations (chat, files, usage, admin)
scripts/            # Helpers for OpenRouter model catalog ingestion
public/             # Static assets (logos, etc.)
```

## Testing & Quality
- Type safety via TypeScript across Next.js + Convex.
- Linting with `eslint` (`npm run lint`).
- Rich logging in Convex functions for observability of BYOK, file uploads, and usage tracking.

## Deployment Notes
- Deploy the Next.js app via Vercel or containerize for ECS/GKE. Ensure environment variables are mirrored.
- Convex deployment should be promoted from dev to production (`npx convex deploy`), and the `NEXT_PUBLIC_CONVEX_URL` updated accordingly.
- Configure Clerk production keys and OpenRouter base URL (`https://openrouter.ai/api/v1`).

## Additional Guides
- [Admin setup](ADMIN_SETUP.md)
- [Bring Your Own Key setup](BYOK_SETUP.md)
- [File upload internals](IMPLEMENTATION_FILEUPLOAD.md)
- [Usage monitoring architecture](IMPLEMENTATION_USAGE_MONITORING.md)

## License
[MIT](LICENSE)

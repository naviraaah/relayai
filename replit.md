# Relay - Robot Companion Console

## Overview

Relay is a web application for managing personal robot companions. Users can create robot profiles (name, personality mode, safety level), send task commands to robots, and review execution results with AI-powered summaries. The app simulates a robot operations console where users go through onboarding to create a robot, then use a console to dispatch tasks ("runs") and review outcomes including instruction packs, video playback, and AI reflections.

The project follows a monorepo structure with a React frontend, Express backend, and PostgreSQL database. It was built as a hackathon project demonstrating robotics output combined with AI-powered insights.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- **Feb 2026**: Google Calendar & Gmail integration
  - Google Calendar: fetches today's events, busy/free windows via Replit connector
  - Gmail: extracts email signals (from/subject/date/snippet) and classifies types (delivery, event invite, reservation, urgent, newsletter, general)
  - Dashboard shows Schedule card with upcoming events and free windows
  - Dashboard shows Email Signals card with actionable emails highlighted
  - Privacy notices on both cards: "We only use your schedule blocks to plan support moments" and "We only extract intent signals. We don't store raw email content"
  - API routes: `GET /api/calendar/events` and `GET /api/email/signals`
  - Auto-refresh: Calendar every 60s, Email every 120s
  - Backend files: `server/google-calendar.ts`, `server/google-mail.ts`
- **Feb 2026**: Runloop devbox integration for robot runs
  - Each run now executes on a Runloop cloud devbox (via `@runloop/api-client` SDK)
  - Run creation sets status to "processing", then async Runloop execution completes in background
  - Instruction pack steps converted to shell commands and executed on devbox
  - Results stored in `runloopOutput` JSONB column with per-step stdout/stderr/exit codes
  - `devboxId` column tracks which devbox handled the run
  - Frontend auto-refreshes every 3s for processing/queued runs
  - Run details page shows Runloop execution section with expandable step results
  - Devbox is always shut down in `finally` block to prevent leaks
  - Requires `RUNLOOP_API_KEY` secret
- **Feb 2026**: AI-powered floating chat widget
  - Floating chat button (bottom-right) opens context-aware chat panel
  - Chat uses OpenAI (gpt-4o-mini) via Replit AI Integrations with SSE streaming
  - System prompt pulls live data: robots, runs, journal entries for context-aware responses
  - Conversations/messages stored in PostgreSQL (conversations + messages tables)
  - Chat routes at `/api/conversations` and `/api/conversations/:id/messages`
- **Feb 2026**: Purple gradient buttons
  - `.btn-gradient` CSS class for primary action buttons
  - Applied to Send a task, Send to Robot, Create a Robot, Go to Command Center, Go Home
  - Gradient: hsl(270) → hsl(280) → hsl(300)
- **Feb 2026**: Complete visual theme overhaul to frosted glass / iridescent pastel aesthetic
  - Color palette shifted from pink/rose (340 hue) to lavender/purple (260-270 hue)
  - CSS glassmorphism utility classes: `.glass`, `.glass-card`, `.glass-subtle`, `.iridescent-bg`, `.glow-soft`
  - All pages updated to use glass-card divs instead of Card components for frosted glass look
  - Navbar uses frosted glass with iridescent border
  - Onboarding page uses iridescent background gradient
  - Dark mode fully supported across all glass utilities

## System Architecture

### Directory Structure
- `client/` — React frontend (Vite-based SPA)
- `server/` — Express backend API
- `shared/` — Shared schema definitions (Drizzle ORM + Zod validation)
- `migrations/` — Database migration files
- `attached_assets/` — Product spec documents and images

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite with HMR support in development
- **Routing**: Wouter (lightweight client-side router)
- **State Management**: TanStack React Query for server state
- **UI Components**: Shadcn/ui (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming, custom color scheme with pink/rose primary color
- **Animations**: Framer Motion
- **Fonts**: Playfair Display (headings) and Lato (body text)

**Key Pages**:
- `/` — Mission Control Dashboard (hero card with greeting, in-progress tasks, recent runs, today's support plan, journal preview)
- `/command` — Command Center for sending tasks to robots with robot selection, urgency slider, and context input
- `/runs` — Runs Feed showing all runs across robots with status filters (all/queued/processing/complete/failed)
- `/journal` — Relay Journal with list/detail view of robot daily reflections (mood, highlights, suggestions)
- `/robots` — Robots management page (list, create via /onboarding, delete with confirmation)
- `/onboarding` — Multi-step robot creation wizard (name, personality, safety level, avatar color)
- `/console/:id` — Per-robot command console for dispatching tasks and viewing run history
- `/run/:runId` — Detailed view of a specific run with instruction pack, video, AI summary, and feedback

**Path Aliases**:
- `@/` → `client/src/`
- `@shared/` → `shared/`
- `@assets/` → `attached_assets/`

### Backend Architecture
- **Framework**: Express 5 on Node.js
- **Language**: TypeScript, executed via `tsx`
- **API Pattern**: RESTful JSON API under `/api/` prefix
- **Development**: Vite dev server middleware for HMR; production serves static built files
- **Build**: Custom build script using esbuild for server and Vite for client, outputs to `dist/`

**Key API Endpoints** (from routes.ts):
- `POST /api/robot/create` — Create a new robot profile
- `GET /api/robots` — List all robots
- `GET /api/robots/:id` — Get a specific robot
- `PATCH /api/robots/:id` — Update a robot profile
- `DELETE /api/robots/:id` — Delete a robot and its data
- `POST /api/run/create` — Create a new task run (generates instruction pack server-side)
- `GET /api/run/:id` — Get run details
- `GET /api/runs` — Get all runs across all robots
- `GET /api/robots/:id/runs` — Get all runs for a robot
- `PATCH /api/run/:id` — Update run (feedback, rating, status)
- `GET /api/journal` — Get all journal entries
- `POST /api/journal` — Create a journal entry

**Instruction Pack Generation**: Server-side logic generates structured task plans with steps, safety checks, constraints, and success criteria based on robot mode, safety level, and command context.

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with `drizzle-zod` for schema-to-validation integration
- **Schema Push**: Uses `drizzle-kit push` (no migration files needed for dev)
- **Connection**: `pg` Pool via `DATABASE_URL` environment variable
- **Session Store**: `connect-pg-simple` available for session management

**Database Tables**:
1. `robot_profiles` — Robot configurations (id, name, mode, safetyLevel, avatarColor, createdAt)
2. `runs` — Task execution records (id, robotId, command, context, urgency, status, instructionPack as JSONB, videoUrl, aiSummary as JSONB, userRating, userFeedback, improvedPlan as JSONB, createdAt)
3. `journal_entries` — Robot daily reflections (id, robotId, title, mood, content, highlights as text[], whatRelayDid as text[], suggestions as text[], createdAt)
4. `users` — User accounts (defined but not fully utilized yet)
5. `conversations` — Chat conversations (id serial, title, createdAt)
6. `messages` — Chat messages (id serial, conversationId FK, role, content, createdAt)

**IDs**: UUIDs generated via PostgreSQL's `gen_random_uuid()`

**Seed Data**: The server seeds demo robots (Nova, Bolt, Atlas), sample runs, and journal entries on first startup if the database is empty.

### Storage Layer
- `DatabaseStorage` class implements the `IStorage` interface
- All database operations go through this abstraction layer in `server/storage.ts`
- Exported as a singleton `storage` instance

## External Dependencies

### Required Services
- **PostgreSQL Database**: Required. Connection via `DATABASE_URL` environment variable. Used for all persistent data storage.

### Key NPM Dependencies
- **Frontend**: React, Wouter, TanStack React Query, Framer Motion, Shadcn/ui (Radix UI + Tailwind), react-hook-form, date-fns, recharts
- **Backend**: Express 5, Drizzle ORM, pg (node-postgres), connect-pg-simple, express-session, zod
- **Build**: Vite, esbuild, tsx, TypeScript
- **Replit-specific**: @replit/vite-plugin-runtime-error-modal, @replit/vite-plugin-cartographer, @replit/vite-plugin-dev-banner

### Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (required)
- `NODE_ENV` — Controls development vs production behavior
- `RUNLOOP_API_KEY` — Runloop API key for devbox execution (required for run execution)

### Scripts
- `npm run dev` — Start development server with HMR
- `npm run build` — Build client and server for production
- `npm start` — Run production build
- `npm run db:push` — Push schema changes to database
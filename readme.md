# 🎬 AI Storyboard Web App

A full-stack web application that transforms a simple movie idea into a complete AI-generated storyboard — with scene breakdowns, character definitions, image generation, and video creation, all through an intuitive, real-time UI with human-in-the-loop control at every step.

---

## Demo
[![Video Description](https://github.com/ketan27j/whisky-goggles/blob/main/docs/play.jpg)](https://youtu.be/Jid_8jYgz04)


## 📖 Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [UI Flow — Screen by Screen](#ui-flow--screen-by-screen)
- [High-Level Pipeline Flow](#high-level-pipeline-flow)
- [Project Structure](#project-structure)
- [Backend — NestJS + LangGraph](#backend--nestjs--langgraph)
  - [LangGraph State](#langgraph-state)
  - [LangGraph Pipeline Graph](#langgraph-pipeline-graph)
  - [LangGraph Nodes](#langgraph-nodes)
  - [REST API Endpoints](#rest-api-endpoints)
  - [WebSocket Events](#websocket-events)
  - [Image Generation](#image-generation)
  - [Video Generation](#video-generation)
- [Frontend — React + TypeScript](#frontend--react--typescript)
  - [Zustand Store](#zustand-store)
  - [Socket.io Hook](#socketio-hook)
  - [Screen Components](#screen-components)
- [Real-Time Architecture](#real-time-architecture)
- [Human-in-the-Loop Design](#human-in-the-loop-design)
- [Setup & Installation](#setup--installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Output Structure](#output-structure)
- [Design Decisions & Tradeoffs](#design-decisions--tradeoffs)
- [Known Limitations](#known-limitations)

---

## Overview

This application gives filmmakers, animators, and creators a guided AI pipeline to go from concept to storyboard in minutes. Every step is visible and controllable — the user approves the story plan, reviews each scene's video script, triggers image generation per frame, and kicks off video generation — all within a single cinematic web interface.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        REACT FRONTEND                               │
│  Screen 1: Idea Input → Screen 2: Plan Review → Screen 3: Scene    │
│  Workshop → Screen 4: Export Gallery                                │
│                        ↕ REST + WebSocket (Socket.io)              │
├─────────────────────────────────────────────────────────────────────┤
│                       NESTJS BACKEND                                │
│  PipelineController → PipelineService → LangGraph Pipeline          │
│  PipelineGateway (Socket.io) ← real-time events                    │
│  GenerationService → [Gemini Flash Image API]              │
│  StorageService → output/images/, output/videos/                   │
│  BullMQ Workers ← Redis job queue                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | UI framework |
| Frontend Styling | TailwindCSS + custom CSS | Cinematic dark theme |
| Frontend Animation | Framer Motion | Scene transitions, card reveals |
| Frontend State | Zustand | Global pipeline state |
| Frontend Server State | TanStack React Query | API calls, polling |
| Frontend Real-time | Socket.io-client | Live LLM + generation updates |
| Backend Framework | NestJS + TypeScript | REST API + WebSocket server |
| Agent Orchestration | LangGraph.js | Stateful pipeline with interrupts |
| LLM | LangChain.js + Gemini Flash | Scene gen, video scripting, camera optimization |
| Image Generation | Gemini 2.5 flash image API (primary) | High-quality AI image generation |
| Video Generation | Google Veo 3 API (primary) | AI video from image + prompt |
| Job Queue | BullMQ + Redis | Non-blocking image/video jobs |
| State Persistence | LangGraph MemorySaver / SqliteSaver | Survive page refreshes |
| File Storage | Local filesystem (extendable to S3) | output/images/, output/videos/ |

---

## UI Flow — Screen by Screen

```
┌─────────────────────────────────────────────────┐
│  SCREEN 1: Movie Idea Input                     │
│                                                 │
│  🎬 What's your movie idea?                     │
│  ┌──────────────────────────────────────────┐   │
│  │  Large animated textarea                 │   │
│  │  with example placeholder                │   │
│  └──────────────────────────────────────────┘   │
│  [Generate Storyboard →]                        │
└─────────────────────────────────────────────────┘
          ↓ LLM generates (text streams in)
┌─────────────────────────────────────────────────┐
│  SCREEN 2: Story Plan Review                    │
│                                                 │
│  📖 Story Snapshot  |  👥 Characters            │
│  (animated reveal)  |  RUSTY — round robot...  │
│                     |  DRONE — black quad...   │
│                                                 │
│  Scene Cards (fade in one by one):              │
│  ┌──────────────────────────────────────────┐   │
│  │ SCENE 1 · Discovery · Forest            │   │
│  │ SCENE 2 · Confrontation · Mountain      │   │
│  │ SCENE 3 · Resolution · Dragon Lair      │   │
│  └──────────────────────────────────────────┘   │
│  [✅ Approve Plan]   [🔄 Regenerate]            │
└─────────────────────────────────────────────────┘
          ↓ Per-scene processing
┌─────────────────────────────────────────────────┐
│  SCREEN 3: Scene Workshop                       │
│                                                 │
│  Scene 2 of 5  ████████░░░░░░  40%             │
│  ┌──────────────────┬──────────────────────────┐│
│  │  SCENE BRIEF     │  IMAGE SEQUENCE          ││
│  │                  │                          ││
│  │  Goal:           │  ┌────────────────────┐  ││
│  │  Danger arrives  │  │ Image 1            │  ││
│  │                  │  │ [prompt text...]   │  ││
│  │  Characters:     │  │ [🎨 Generate]      │  ││
│  │  🟢 RUSTY        │  │ ┌────────────────┐ │  ││
│  │  🔴 DRONE        │  │ │ generated img  │ │  ││
│  │                  │  │ └────────────────┘ │  ││
│  │  Location:       │  └────────────────────┘  ││
│  │  Mountain pass   │                          ││
│  │                  │  ┌────────────────────┐  ││
│  │                  │  │ Video Prompt 1     │  ││
│  │                  │  │ (optimized camera) │  ││
│  │                  │  │ [🎬 Generate Video]│  ││
│  │                  │  └────────────────────┘  ││
│  └──────────────────┴──────────────────────────┘│
│  [← Prev]  [✅ Approve & Next →]  [⏭ Skip]     │
└─────────────────────────────────────────────────┘
          ↓ All scenes complete
┌─────────────────────────────────────────────────┐
│  SCREEN 4: Export Gallery                       │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Scene 1  │  │ Scene 2  │  │ Scene 3  │      │
│  │ [images] │  │ [images] │  │ [images] │      │
│  │ [▶ vid]  │  │ [▶ vid]  │  │ [▶ vid]  │      │
│  └──────────┘  └──────────┘  └──────────┘      │
│  [⬇ Download All Images] [⬇ Download All Videos]│
└─────────────────────────────────────────────────┘
```

---

## High-Level Pipeline Flow

```
User submits movie idea
        │
        ▼
[generate_scenes_node]          ← LLM + char_scene_gen.txt
  • Parses STEP 1: Story Snapshot
  • Parses STEP 2: Character Definitions
  • Parses STEP 3: Scene Breakdown (4–6 scenes)
  • Filters characters per scene
        │
        ▼
[INTERRUPT: human_approve_plan] ← WebSocket → Screen 2
  User sees story plan, clicks Approve or Regenerate
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  Per-scene loop:                                    │
│                                                     │
│  [process_scene_node]      ← LLM + video_gen.txt   │
│    • Section 1: Character image prompts             │
│    • Section 2: Scene image sequence (3–4 images)  │
│    • Section 3: Video motion prompts                │
│          │                                          │
│          ▼                                          │
│  [INTERRUPT: human_approve_scene] ← WebSocket       │
│    User reviews image prompts and video prompts     │
│          │                                          │
│          ▼                                          │
│  [optimize_camera_node]    ← LLM + camera_moves.txt │
│    Enriches each video prompt with best camera move  │
│          │                                          │
│          ▼                                          │
│  User clicks [🎨 Generate Image] per image prompt  │
│  → POST /api/pipeline/:id/generate-image           │
│  → BullMQ job → Imagen 3 API                       │
│  → WebSocket: image:progress → UI updates preview  │
│          │                                          │
│          ▼                                          │
│  User clicks [🎬 Generate Video] per video prompt  │
│  → POST /api/pipeline/:id/generate-video           │
│  → BullMQ job → Veo 2 API / Grok Playwright        │
│  → WebSocket: video:progress → UI updates player   │
│          │                                          │
│          ▼                                          │
│  [next_scene_or_finish_node]                        │
└─────────────────────────────────────────────────────┘
        │
        ▼
[END] → Screen 4: Export Gallery
  output/images/scene_01_image_01.png ...
  output/videos/scene_01_video_01.mp4 ...
```

---

## Project Structure

```
storyboard-web/
├── frontend/                              # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/
│   │   │   ├── pipeline/
│   │   │   │   ├── IdeaInput.tsx          # Screen 1: movie idea entry
│   │   │   │   ├── StoryPlanReview.tsx    # Screen 2: approve plan
│   │   │   │   ├── SceneWorkshop.tsx      # Screen 3: per-scene generation
│   │   │   │   └── ExportGallery.tsx      # Screen 4: download results
│   │   │   └── ui/
│   │   │       ├── SceneCard.tsx          # Scene summary card
│   │   │       ├── CharacterBadge.tsx     # Character avatar + name
│   │   │       ├── ImagePromptCard.tsx    # Prompt text + Generate btn + preview
│   │   │       ├── VideoPromptCard.tsx    # Optimized prompt + Generate Video
│   │   │       ├── StreamingText.tsx      # Animated LLM text stream
│   │   │       └── PipelineProgress.tsx   # Step progress bar
│   │   ├── stores/
│   │   │   └── pipelineStore.ts           # Zustand: full pipeline state
│   │   ├── hooks/
│   │   │   ├── usePipeline.ts             # React Query API calls
│   │   │   └── useSocket.ts               # Socket.io connection + events
│   │   ├── types/
│   │   │   └── pipeline.types.ts          # Shared TypeScript types
│   │   └── pages/
│   │       └── StoryboardPage.tsx         # Root page, screen router
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── backend/                               # NestJS + TypeScript
│   ├── src/
│   │   ├── main.ts                        # NestJS bootstrap
│   │   ├── app.module.ts                  # Root module
│   │   ├── common/
│   │   │   └── llm.factory.ts             # Anthropic / OpenAI factory
│   │   ├── pipeline/
│   │   │   ├── pipeline.module.ts
│   │   │   ├── pipeline.controller.ts     # REST endpoints
│   │   │   ├── pipeline.service.ts        # LangGraph orchestration
│   │   │   ├── pipeline.gateway.ts        # Socket.io WebSocket gateway
│   │   │   └── graph/
│   │   │       ├── state.ts               # PipelineStateAnnotation
│   │   │       ├── pipeline.graph.ts      # StateGraph builder
│   │   │       └── nodes/
│   │   │           ├── sceneGenerator.ts  # Agent 1: parse scenes
│   │   │           ├── videoScripter.ts   # Agent 2: image+video prompts
│   │   │           └── cameraOptimizer.ts # Agent 3: camera enrichment
│   │   ├── generation/
│   │   │   ├── generation.module.ts
│   │   │   ├── generation.service.ts      # Routes to Imagen/Veo/Grok
│   │   │   ├── imagen.service.ts          # Google Imagen 3 API
│   │   │   ├── veo.service.ts             # Google Veo 2 API
│   │   │   └── grok.service.ts            # Playwright → Grok
│   │   ├── storage/
│   │   │   ├── storage.module.ts
│   │   │   └── storage.service.ts         # Save files, serve static
│   │   └── jobs/
│   │       ├── image.processor.ts         # BullMQ image worker
│   │       └── video.processor.ts         # BullMQ video worker
│   ├── tsconfig.json
│   ├── package.json
│   └── .env.example
│
├── prompts/
│   ├── char_scene_gen.txt                 # Prompt 1: story + scene breakdown
│   ├── video_gen.txt                      # Prompt 2: image + video scripts
│   └── camera_moves.txt                   # 38 cinematic camera move references
│
├── output/                                # Generated files (git-ignored)
│   ├── images/
│   │   ├── scene_01_image_01.png
│   │   └── ...
│   └── videos/
│       ├── scene_01_video_01.mp4
│       └── ...
│
├── auth/                                  # Browser auth states (git-ignored)
│   ├── grok_state.json
│   └── leonardo_state.json
│
├── docker-compose.yml                     # Postgres + Redis + app
└── README.md
```

---

## Backend — NestJS + LangGraph

### LangGraph State

The entire pipeline shares a single typed `PipelineStateAnnotation`. It is persisted via LangGraph's `MemorySaver` (or `SqliteSaver` for production) so the pipeline survives page refreshes and server restarts.

---

### Screen Components

#### Screen 1 — `IdeaInput.tsx`
- Large animated textarea with fade-in character counter
- Film strip decorative border
- "Generate Storyboard" CTA that calls `POST /api/pipeline/start`
- Loading state with animated film reel while LLM runs

#### Screen 2 — `StoryPlanReview.tsx`
- Story snapshot card with typewriter animation (streams from WebSocket)
- Character cards fading in with avatar placeholder + name/description
- Scene cards stacked vertically, each revealing with stagger delay
- Each scene card shows: scene number, goal, location, character badges
- `[✅ Approve Plan]` → `POST /approve-plan`
- `[🔄 Regenerate]` → `POST /approve-plan { regenerate: true }`

#### Screen 3 — `SceneWorkshop.tsx`
- Split-panel layout: scene brief (left) + generation workspace (right)
- Scene brief: goal, location, characters present with color-coded badges
- Progress bar: current scene / total scenes
- **ImagePromptCard** per image in sequence:
  - Prompt text displayed in monospace card
  - `[🎨 Generate Image]` button → `POST /generate-image`
  - Spinner while generating
  - Smooth fade-in image preview when done
  - Click to expand full-size
- **VideoPromptCard** per video motion prompt:
  - Raw prompt text
  - Optimized prompt text (with camera move highlighted)
  - Shows which input image(s) it references
  - `[🎬 Generate Video]` button (enabled only after referenced image is ready)
  - Video player appears inline when done
- `[✅ Approve & Next →]` → `POST /approve-scene`
- `[⏭ Skip]` → `POST /approve-scene { skip: true }`

#### Screen 4 — `ExportGallery.tsx`
- Masonry grid of all generated images organized by scene
- Inline video players for each generated clip
- Scene tabs to filter by scene
- `[⬇ Download All Images]` → zip download
- `[⬇ Download All Videos]` → zip download
- Summary stats: total scenes, images, videos

---

## Real-Time Architecture

```
User Action (click button)
      │
      ▼
React Component
  → HTTP POST to NestJS REST endpoint
      │
      ▼
NestJS Controller
  → PipelineService.approvePlan() / approveScene() / generateImage()
      │
      ├── Updates LangGraph state
      ├── Resumes graph execution (async)
      └── BullMQ: adds generation job to queue
              │
              ▼
      LangGraph stream runs nodes
              │
              ▼
      PipelineGateway.emitStateUpdate()
              │
              ▼  Socket.io
      Frontend useSocket hook receives event
              │
              ▼
      Zustand store.updateFromBackend()
              │
              ▼
      React components re-render with new state
```

Image/video generation jobs flow separately:

```
POST /generate-image
      │
      ▼
BullMQ image queue
      │
      ▼
ImageProcessor worker (BullMQ)
  → Imagen 3 API call (30–60 seconds)
      │
      ▼
StorageService.saveImage()
  → output/images/scene_01_image_01.png
      │
      ▼
PipelineGateway.emitImageProgress({ status: 'done', url })
      │
      ▼  Socket.io
Frontend ImagePromptCard fades in the image preview
```

---

## Human-in-the-Loop Design

LangGraph's `interruptBefore` pauses the graph before a node. The backend emits a WebSocket event; the frontend shows the appropriate approval UI. The graph resumes only when the user acts.

```
Graph running → hits interruptBefore: ['human_approve_plan']
      │
      ▼ (graph is paused, waiting)
Backend: PipelineGateway.emitInterrupt({ type: 'approve_plan', state })
      │
      ▼ WebSocket
Frontend: setScreen('plan') → StoryPlanReview renders
User reads the plan, clicks [✅ Approve]
      │
      ▼ HTTP POST
Backend: graph.updateState({ scenesApproved: true })
         graph.stream(null, config)  ← resume
      │
      ▼
Graph continues from after the interrupt node
```

This pattern repeats once per scene at `human_approve_scene`.

---

## Setup & Installation

### Prerequisites

- Node.js 20+
- Redis (for BullMQ job queue)
- Google Cloud project with Vertex AI enabled (for Imagen 3 / Veo 2)
- Anthropic or OpenAI API key

### Install

```bash
git clone https://github.com/yourname/storyboard-web.git
cd storyboard-web

# Backend
cd backend
npm install
cp .env.example .env    # fill in your keys

# Frontend
cd ../frontend
npm install
```

### Start Redis

```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or with docker-compose (includes Redis + app)
docker-compose up -d
```

### Run (development)

```bash
# Terminal 1: Backend
cd backend
npm run start:dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

App runs at:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`
- WebSocket: `ws://localhost:3001/pipeline`

### One-time: Save browser auth (for Grok/Leonardo fallback)

```bash
cd backend
npx ts-node src/auth/save-auth.ts --tool grok
```

---

## Configuration

### Backend `.env`

```env
# LLM
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
LLM_MODEL=claude-sonnet-4-5

# Image generation
IMAGE_GEN_PROVIDER=imagen         # imagen | leonardo | manual
GOOGLE_PROJECT_ID=my-project
GOOGLE_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./gcp-credentials.json

# Video generation
VIDEO_GEN_PROVIDER=veo            # veo | grok | manual
GROK_AUTH_STATE=./auth/grok_state.json

# Browser automation
HEADLESS_BROWSER=false
IMAGE_GEN_TIMEOUT=120000
VIDEO_GEN_TIMEOUT=300000

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# App
PORT=3001
FRONTEND_URL=http://localhost:5173
OUTPUT_DIR=./output
PROMPTS_DIR=../prompts
```

### Frontend `.env`

```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=http://localhost:3001
```

---

## Usage

1. Open `http://localhost:5173`
2. Type your movie idea in the text area and click **Generate Storyboard**
3. Wait for the scene plan to stream in (10–30 seconds)
4. **Screen 2:** Review the story plan, character definitions, and scene cards
   - Click **✅ Approve Plan** to proceed
   - Click **🔄 Regenerate** to get a new plan
5. **Screen 3:** For each scene:
   - Review the scene brief (goal, location, characters)
   - Click **🎨 Generate Image** for each image prompt — previews appear in real time
   - Click **🎬 Generate Video** for each video prompt (enabled after its source image is ready)
   - Click **✅ Approve & Next** to move to the next scene
6. **Screen 4:** View and download all generated images and videos

---

## Output Structure

```
output/
├── images/
│   ├── scene_01_image_01.png
│   ├── scene_01_image_02.png
│   ├── scene_01_image_03.png
│   ├── scene_02_image_01.png
│   └── ...
└── videos/
    ├── scene_01_video_01.mp4
    ├── scene_01_video_02.mp4
    ├── scene_02_video_01.mp4
    └── ...
```

Files are served statically at `http://localhost:3001/output/...` and can be downloaded individually or as a batch from the gallery screen.

---

## Design Decisions & Tradeoffs

| Decision | Choice | Rationale |
|---|---|---|
| Agent framework | LangGraph.js | `interruptBefore` is the cleanest human-in-the-loop primitive available |
| Real-time updates | Socket.io over Server-Sent Events | Bidirectional needed for session joining; SSE is one-way |
| Job queue | BullMQ + Redis | Image/video jobs are 30–300s; non-blocking queue prevents HTTP timeouts |
| Image API | Google Imagen 3 | Best quality, no browser automation fragility; requires GCP project |
| Video API | Google Veo 2 | Same reasoning; Grok Playwright kept as fallback |
| Character filtering | Per-scene extraction | Keeps Agent 2 prompts tight; prevents hallucinating absent characters |
| State persistence | MemorySaver (dev) / SqliteSaver (prod) | Allows resume after page refresh without a full database |
| File serving | Express static middleware | Simple; extend to S3/CDN for production |
| Camera optimization | Separate Agent 3 node | Decouples cinematography from scripting; can be regenerated independently |

---

## Known Limitations

- **Browser selector fragility:** Playwright selectors for Grok and Leonardo.ai will break when those sites update their UI. Inspect and update selectors using `--inspect` mode before each major use.
- **Veo 2 / Imagen 3 access:** These Google Vertex AI models require allowlist access as of early 2025. Substitute `imagegeneration@006` for Imagen 2 if Imagen 3 is unavailable.
- **Redis required:** BullMQ will not work without a running Redis instance. Use the provided `docker-compose.yml` for local development.
- **Session persistence:** The default `MemorySaver` loses state on server restart. Switch to `SqliteSaver` in production by setting `LANGGRAPH_CHECKPOINTER=sqlite` in `.env`.
- **Concurrent users:** The current `MemorySaver` checkpointer is in-process. For multi-user production, use a shared checkpointer (Redis or Postgres-backed).
- **Video file size:** Generated MP4s can be 50–200 MB. Configure a CDN or object storage (S3/GCS) for the `output/` directory in production rather than serving via Express.

---

## License

MIT License. See `LICENSE` for details.

# TemplateForge

A self-hosted visual template designer and data-merge export platform.

## Quick Start

### Prerequisites
- Node.js 20+
- Docker (for Redis)

### 1. Start Redis
```bash
docker-compose up -d redis
```

### 2. Start Backend
```bash
cd backend
npm install
npm run dev
```

### 3. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + Polotno SDK (port 3000)
- **Backend**: Node.js + Fastify (port 4000)
- **Queue**: BullMQ + Redis (port 6379)

## Storage
All data is stored locally in `/storage/`:
- `/storage/templates/` — Template JSON files
- `/storage/assets/` — Uploaded images and ZIP-extracted assets
- `/storage/exports/` — Generated PDF/PPTX output files
- `/storage/fonts/` — Custom uploaded fonts
- `/storage/thumbnails/` — Auto-generated template preview images

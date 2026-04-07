# FitTrack

Modular fitness tracking app with athlete and coach roles — now with real-time chat, connection requests, and in-chat notifications.

## Stack

- **Frontend**: React 18, Vite, TypeScript, TailwindCSS v4, React Query, Recharts
- **Backend**: Node.js, Express, TypeScript, Mongoose, Socket.io
- **Database**: MongoDB Atlas
- **Auth**: JWT + bcrypt
- **Validation**: Zod (shared between client and server)

## Features

- Modular fitness dashboard (custom metrics & tracking)
- Athlete ↔ Coach system
- Coach connection flow (request → accept/decline)
- Real-time chat (Socket.io)
- Chat-based notification system:
  - Connection requests
  - Accept / decline responses
  - Metric permission updates
- Fine-grained metric sharing
- Unread message tracking

## Setup

### 1. Install dependencies

```bash
# Server
cd server && npm install

# Client
cd ../client && npm install
```

### 2. Configure environment

Create `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/fitnessapp?retryWrites=true&w=majority
JWT_SECRET=your_long_random_secret
NODE_ENV=development
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Seed the database (optional but recommended)

```bash
cd server && npm run seed
```

This creates two demo accounts:
- **Athlete** — `athlete@demo.com` / `password123`
- **Coach** — `coach@demo.com` / `password123`

### 4. Run the app

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

Open http://localhost:5173

## Project structure

```
atheliq/
├── client/
│   └── src/
│       ├── components/
│       │   ├── auth/         # Mobile connect modal
│       │   ├── cards/        # Stat cards & tables
│       │   ├── chart/        # Charts (Recharts)
│       │   ├── chat/         # Chat UI (Sidebar, Window, Notifier)
│       │   ├── layout/       # Layout components
│       │   └── ui/           # UI helpers (MotivationBot)
│       ├── hooks/            # useAuth, useStats, useCoach, chat hooks
│       ├── lib/              # API client, socket connection
│       ├── pages/
│       │   ├── athlete/      # Athlete dashboard & coach management
│       │   ├── coach/        # Coach dashboard
│       │   ├── chat/         # Chat page
│       │   ├── onboarding/
│       │   ├── LoginPage
│       │   └── RegisterPage
│       └── types/            # Shared frontend types
│
├── server/
│   └── src/
│       ├── models/           # MongoDB models
│       │   ├── User
│       │   ├── CoachAthlete
│       │   ├── ChatThread
│       │   ├── ChatMessage
│       │   ├── StatCard
│       │   └── StatEntry
│       ├── routes/
│       │   ├── auth
│       │   ├── athlete
│       │   ├── coach         # connect, permissions, relations
│       │   ├── chat          # threads, messages, accept/decline
│       │   └── stats
│       ├── middleware/       # JWT auth & role guards
│       ├── lib/              # db + jwt utils
│       ├── socket.ts         # real-time chat (Socket.io)
│       └── index.ts          # server entry
│
└── shared/
    └── schemas/              # Zod schemas (shared)
```


# SPAQ

Modern fitness tracking platform with athlete and coach roles, onboarding-driven setup, real-time chat, metric sharing, and an AI-ready foundation for personalized insights.

## Overview

SPAQ is a modular fitness app built around two roles:

- **Athletes** track health and performance metrics in a flexible dashboard
- **Coaches** monitor connected athletes, review shared metrics, and communicate in real time

The app now includes:

- structured athlete onboarding
- dashboard auto-setup from onboarding
- persistent athlete card arrangement
- coach-side personal card arrangement
- real-time chat and connection workflows
- AI-ready profile + stats context for future smart coaching features
- mobile-connect groundwork for smartwatch / Health Connect style syncing later

---

## Stack

### Frontend

- React 18
- Vite
- TypeScript
- TailwindCSS v4
- TanStack Query
- Recharts
- dnd-kit

### Backend

- Node.js
- Express
- TypeScript
- Mongoose
- Socket.io

### Database

- MongoDB Atlas

### Auth

- JWT
- bcrypt

### Validation

- Zod shared between client and server

---

## Core Features

### Athlete dashboard

- modular stat cards
- add / edit / delete cards
- reorder cards with drag and drop
- persistent card order stored in backend
- latest values + day-specific values
- chart visualization for selected metrics
- weight updates with manual delta control
- custom metrics and entry logging

### Coach dashboard

- linked athlete overview
- active/inactive athlete indicators by selected time range
- coach-side metric card arrangement
- local personalized card order per athlete
- visual progress review across flexible time ranges
- shared metric access control

### Athlete ↔ Coach system

- connect request flow
- accept / decline requests
- metric permission updates
- relation-based access control

### Real-time chat

- athlete ↔ coach messaging
- unread tracking
- chat sidebar + thread view
- in-chat request handling
- notification-style chat updates

### Onboarding

- athlete onboarding required after first login
- onboarding-aware auth redirects
- profile creation from onboarding
- auto-generated starter cards
- initial weight automatically seeded into stats
- onboarding data stored as reusable athlete profile context

### AI-ready foundation

- athlete profile model
- enriched context for future motivation / insight generation
- profile + stats prepared for Ollama-first / optional external provider setup later

### Mobile / sync direction

- mobile connect modal
- groundwork for future smartwatch / Health Connect / Google Fit style integrations
- onboarding hints for later automatic sync instead of manual-only tracking

---

## Current Product Behavior

### Athlete flow

1. Register as athlete
2. Login
3. If onboarding is incomplete, redirect to `/onboarding`
4. Complete onboarding
5. Profile is stored
6. Starter cards are created automatically depending on onboarding choices
7. Initial weight is stored as the first weight entry
8. Athlete lands on dashboard and can immediately edit, delete, reorder, or extend cards

### Coach flow

1. Register/login as coach
2. Open coach dashboard
3. View linked athletes
4. Review shared metrics
5. Arrange dashboard cards locally per athlete
6. Use chat for communication and request handling

---

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
SPAQ/
├── client/
│   └── src/
│       ├── components/
│       │   ├── auth/         # mobile connect modal
│       │   ├── cards/        # stat cards, edit/delete/logging UI
│       │   ├── chart/        # chart components
│       │   ├── chat/         # chat sidebar, window, notifier
│       │   ├── layout/       # layout widgets
│       │   └── ui/           # motivation bot and dashboard helpers
│       ├── hooks/            # auth, stats, coach, unread chat hooks
│       ├── lib/              # API client, socket
│       ├── pages/
│       │   ├── athlete/      # athlete dashboard, coaches page
│       │   ├── coach/        # coach dashboard
│       │   ├── chat/         # chat page
│       │   ├── onboarding/   # onboarding flow
│       │   ├── LoginPage.tsx
│       │   └── RegisterPage.tsx
│       └── types/
│
├── server/
│   └── src/
│       ├── ai/               # AI context builders / providers
│       ├── lib/              # db, jwt, onboarding presets
│       ├── middleware/       # auth + role guards
│       ├── models/
│       │   ├── User
│       │   ├── AthleteProfile
│       │   ├── CoachAthlete
│       │   ├── ChatThread
│       │   ├── ChatMessage
│       │   ├── MobileLoginToken
│       │   ├── StatCard
│       │   └── StatEntry
│       ├── routes/
│       │   ├── auth
│       │   ├── athlete
│       │   ├── coach
│       │   ├── chat
│       │   ├── stats
│       │   └── ai
│       ├── socket.ts
│       └── index.ts
│
└── shared/
    └── schemas/              # shared zod schemas
```

## Important API Areas

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

**Auth response includes:**

- user id
- role
- onboarding completion state

---

### Athlete

- `GET /api/athlete/cards`
- `POST /api/athlete/cards`
- `PATCH /api/athlete/cards/:id`
- `DELETE /api/athlete/cards/:id`
- `PATCH /api/athlete/cards/reorder`
- `PATCH /api/athlete/weight`
- `GET /api/athlete/profile`
- `PATCH /api/athlete/profile`
- `POST /api/athlete/onboarding`

---

### Stats

- `POST /api/stats/entries`
- `DELETE /api/stats/entries/:id`
- `GET /api/stats/latest`
- `GET /api/stats/day?date=YYYY-MM-DD`
- `GET /api/stats/entries/:cardId`

---

### Coach

- athlete relation and permissions routes
- stats access for allowed metrics
- activity overview

---

### Chat

- threads
- messages
- request accept / decline
- unread counts
- socket events

---

### AI

Prepared for:

- motivation
- insights
- contextual athlete chat

Currently based on:

- athlete profile + stats foundation

---

## Card Behavior

All cards, including onboarding-generated cards, are normal `StatCard` documents.

They can all be:

- edited
- deleted
- reordered
- logged manually
- visualized in charts
- used for weight updates
- shared with coaches based on permissions

There are **no special locked onboarding cards**.

---

## Reordering Logic

### Athlete

Athlete card order is stored in the backend using `StatCard.order`.

This means:

- drag & drop order survives reload
- order is consistent across sessions/devices

### Coach

Coach card order is stored locally in `localStorage` per athlete.

This means:

- coach can personalize their own view
- it survives reload in the same browser
- it does not affect athlete card order
- it is not synced across devices

---

## Onboarding Model

Athlete onboarding captures:

- current weight
- target weight
- height
- birth date
- gender
- primary goal
- reason / motivation
- event target
- lifestyle
- activity level
- experience
- workouts per week
- pain points
- diet preference
- meal structure
- training location
- equipment level
- available days
- sleep quality
- stress level
- limitations
- AI tone
- notes
- preferred start mode

This data is stored in `AthleteProfile` and reused for:

- dashboard setup
- initial card generation
- AI context
- coaching context
- future personalization

---

## Known Product Direction

Planned / prepared next steps:

- local Ollama-first AI integration
- optional Gemini or external provider support
- AI chat tab for athletes
- AI-generated motivation and insights
- smartwatch / Health Connect / Google Fit import
- mobile app connection
- richer profile editing after onboarding
- coach notes and intervention workflows
- deeper trend analysis and adherence scoring

---

## Development Notes

- athlete onboarding is part of the required auth flow
- login/register must return `onboardingCompleted`
- auth must not fail if athlete profile lookup fails

**Important:**

- `/cards/reorder` must be declared before `/cards/:id`

- `athleteId` and `cardId` are Mongo `ObjectId`s  
  → always ensure proper casting in queries

---

## Demo Use Cases

### Athlete

- create account
- complete onboarding
- get auto-generated starter dashboard
- manually adjust weight
- add custom metrics
- delete unwanted starter cards
- share selected metrics with coach
- chat with coach

### Coach

- receive athlete request
- accept connection
- monitor allowed metrics
- reorder own dashboard view
- check activity in selected time ranges
- message athlete directly

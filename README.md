# FitTrack

Modular fitness tracking app with athlete and coach roles.

## Stack

- **Frontend**: React 18, Vite, TypeScript, TailwindCSS v4, React Query, Recharts
- **Backend**: Node.js, Express, TypeScript, Mongoose
- **Database**: MongoDB Atlas
- **Auth**: JWT + bcrypt
- **Validation**: Zod (shared between client and server)

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
fitness-app/
├── client/               # React frontend
│   └── src/
│       ├── components/   # StatCard, AddCardModal, MainChart
│       ├── hooks/        # useAuth, useStats (React Query)
│       ├── lib/          # axios client
│       └── pages/        # LoginPage, RegisterPage, AthleteDashboard, CoachDashboard
├── server/               # Express backend
│   └── src/
│       ├── models/       # User, StatCard, StatEntry, CoachAthlete
│       ├── routes/       # auth, athlete, coach, stats
│       ├── middleware/   # JWT auth, role guard
│       └── lib/          # db connection, jwt utils
└── shared/
    └── schemas/          # Zod schemas shared by client + server
```


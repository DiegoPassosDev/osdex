# OSdex

Sistema de gestão de restaurante com pedidos em tempo real via WebSocket, voltado para mesas, cozinha, garçons e caixa.

## Tech Stack

| Layer | Stack |
|-------|-------|
| **Frontend** | Next.js 15 (App Router), Tailwind CSS, Socket.IO Client |
| **Backend** | NestJS, Prisma ORM, Socket.IO, PostgreSQL |
| **Auth** | JWT + bcryptjs |

## Architecture

```
Frontend (Next.js)  ───HTTP──→  Backend (NestJS :3001)
                              ↕ WebSocket (Socket.IO)
                        PostgreSQL
```

- **Employee screens** (waiter, kitchen, cashier, manager): accessed via HTTP for native WebSocket support
- **Guest/table screens**: accessed via HTTPS when using camera (QR code) or notifications
- Socket.IO connects directly to the backend (no proxy) for low-latency WebSocket

## Prerequisites

- Node.js ≥ 18
- pnpm
- PostgreSQL running

## Setup

```bash
# 1. Install dependencies
cd backend && pnpm install && cd ../frontend && pnpm install && cd ..

# 2. Environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your DATABASE_URL

# 3. Database
cd backend
npx prisma migrate deploy
npx prisma db seed         # if available
cd ..

# 4. Start both servers
# Terminal 1 — Backend
cd backend && pnpm start:dev

# Terminal 2 — Frontend
cd frontend && pnpm dev
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for JWT signing |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend URL (e.g. `http://192.168.18.70:3001`) |
| `NEXT_PUBLIC_APP_URL` | Frontend URL (e.g. `http://192.168.18.70:3000`) |

## Dev Credentials

| Role | Email | Password |
|------|-------|----------|
| Manager | `gestor@osdex.com` | `123456` |
| Cashier | `caixa@osdex.com` | `123456` |
| Waiter | `garcom1@osdex.com` | `123456` |
| Kitchen | `cozinha@osdex.com` | `123456` |
| Bar | `bar@osdex.com` | `123456` |

## Project Structure

```
osdex/
├── backend/                # NestJS API
│   ├── prisma/
│   │   ├── schema.prisma   # Database models
│   │   └── migrations/     # Prisma migrations
│   └── src/
│       ├── auth/           # Guest authentication
│       ├── employees/      # Employee auth & CRUD
│       ├── sessions/       # Table sessions
│       ├── orders/         # Orders & items
│       ├── payments/       # Payments & billing
│       ├── gateway/        # Socket.IO gateway
│       └── prisma/         # Prisma module
├── frontend/               # Next.js app
│   ├── app/
│   │   ├── cashier/        # Cashier dashboard
│   │   ├── kitchen/        # Kitchen display
│   │   ├── waiter/         # Waiter panel
│   │   ├── manager/        # Manager dashboard
│   │   └── table/          # Guest/table page
│   └── src/
│       ├── components/     # Shared UI components
│       ├── context/        # React contexts
│       ├── hooks/          # Custom hooks
│       ├── lib/            # Utilities (API, sound)
│       ├── services/       # API service layer
│       └── store/          # Auth store (Zustand)
└── README.md
```

## Features

- **Real-time orders** via WebSocket (new orders, status updates, bill requests)
- **Per-item timer** with prep time tracking and freeze at `READY` status
- **Table sessions** with waiter assignment and guest ownership
- **Payment flow**: bill request → cashier processing → session close
- **Notifications** with sound, localStorage persistence, and badge
- **Roles**: Guest, Waiter, Kitchen, Bar, Cashier, Manager

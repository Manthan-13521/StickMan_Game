# StickMan Arena

Real-time multiplayer Stickman fighting game built with Next.js, Phaser 3, Socket.IO, and Express.

## Architecture

```
stickman-arena/
├── client/          Next.js 14 + Phaser 3 (Vercel)
├── server/          Express + Socket.IO (Railway)
└── shared/          Types, constants, validation (workspace)
```

## Quick Start

```bash
# Install all workspaces
npm install

# Build shared types (required before server/client)
npm run build --workspace=shared

# Start both server and client in dev mode
npm run dev
```

Open http://localhost:3000 for the client game. The server runs on port 3001.

## Environment Variables

| Variable | Default | Required | Description |
|---|---|---|---|
| `PORT` | `3001` | Server | HTTP server port |
| `CORS_ORIGIN` | `*` | Server | Allowed CORS origin |
| `NEXT_PUBLIC_SERVER_URL` | `http://localhost:3001` | Client | WebSocket server URL |

## Controls

### Player 1 (Keyboard)
| Action | Key |
|---|---|
| Move | Arrow Keys |
| Jump | Arrow Up |
| Punch | J |
| Kick | K |
| Block | L |
| Heavy | J + K |
| Ultimate | J + K (when meter full) |

### Player 2 (Keyboard — local 2P)
| Action | Key |
|---|---|
| Move | WASD |
| Jump | W |
| Punch | J |
| Kick | K |
| Block | L |

### Mobile
Touch controls appear automatically on screens < 1024px.

## Deployment

### Client → Vercel

1. Push to GitHub
2. Import `client/` as root directory in Vercel
3. Add environment variable `NEXT_PUBLIC_SERVER_URL` pointing to your Railway server
4. Deploy

### Server → Railway

1. Push to GitHub
2. Import the repository root in Railway
3. Set build command: `npm run build --workspace=shared && npm run build --workspace=server`
4. Set start command: `node server/dist/index.js`
5. Deploy

Or use the included `railway.json` which configures this automatically.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start all workspaces in dev mode |
| `npm run build` | Build all workspaces |
| `npm run type-check` | Type-check all workspaces |
| `npm run lint` | Lint all workspaces |
| `npm test` | Run all workspace tests |
| `npm run build:client` | Build client only |
| `npm run build:server` | Build server only |

## Tech Stack

- **Client**: Next.js 14, Phaser 3, Socket.IO Client, Zustand, Framer Motion, Tailwind CSS
- **Server**: Express, Socket.IO, TypeScript
- **Shared**: TypeScript types, validation, constants (workspace package)
- **Testing**: Vitest (81 tests across shared + server)

## License

MIT

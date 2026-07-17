# Aqua System Web UI

Authenticated Next.js dashboard prototype for the Smart Aqua Manage system. It includes aquarium status, demo equipment controls, an ESP32-CAM preview mockup, operator login, and persistent feeding and glass-cleaning interval settings.

Firebase and hardware control are not connected yet. Credentials and settings are stored on the local Node.js server in an ignored `.data` directory.

## Configure and run

Copy `.env.example` to `.env.local`, then replace the example username, password, and session secret. Generate a strong session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Install and start the development server:

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>. Unauthenticated visitors are redirected to `/login`.

## Security notes

- Passwords are hashed with scrypt and a random salt before local persistence.
- Sessions use signed, HTTP-only, same-site cookies and expire after 8 hours.
- Credential changes revoke all existing sessions.
- Login attempts are limited in memory to five failures per 15 minutes per client address.
- Set `COOKIE_SECURE=true` only when the deployment is behind HTTPS.
- The local JSON store is intended for one persistent Node.js instance. Use a database or managed authentication before deploying multiple instances or a serverless build.
- For remote access, place the app behind HTTPS or a private network such as Tailscale. Do not expose a plain HTTP development server directly to the internet.

## Validate

```bash
pnpm lint
pnpm build
```

# ELYVORA

ELYVORA is an original social-world platform: a global place to connect, share, discover places, develop careers and participate in a simulated digital economy.

This repository contains the first account-backed web application release. It is designed as a mobile-friendly app experience rather than a marketing-only landing page.

## Implemented in this release

- Responsive application shell with desktop sidebar and mobile navigation
- Account registration and sign-in using password hashing and server-side sessions
- D1-backed member profiles and profile editing
- Persistent public social feed, post publishing and post appreciations
- Career listings and authenticated applications
- Persistent virtual wallet, transaction ledger and virtual property acquisitions
- Database schema for follows, comments, conversations, messages, notifications and user reports
- Local demo feed and conversations for visitors who have not signed in
- Cloudflare Workers Builds connected to GitHub for deployments from `main`

## Important current limitations

This is an early product release, not a finished A-to-Z global platform.

- Email verification, password reset and social sign-in are not yet implemented.
- The messaging API is present, but the chat interface is still using local demonstration conversations. Real cross-user message screens and delivery need to be completed.
- Voice notes, audio calling and video calling are not live.
- Image/video file uploads are not live. The Cloudflare account's R2 service still needs to be enabled and configured.
- The World map is a visual concept; live map tiles, geocoding, routes, geolocation and 3D city environments are not connected.
- Career opportunities are starter listings. Employer onboarding, verification, contracts, payroll and real payment processing are not implemented.
- ELYVORA credits and property are a simulated in-app economy only. They are not money, cryptocurrency, investments or legally recognized property ownership, and cannot be redeemed.
- Moderation and reporting tables/API groundwork exist, but a full moderation console, abuse prevention workflow and human review process are still needed.

## Security and privacy foundation

- Passwords are stored as PBKDF2-derived hashes with per-account random salts.
- Sessions are opaque random tokens stored as SHA-256 hashes in D1 and delivered in HttpOnly, SameSite cookies.
- Mutating API calls validate the Origin header when supplied.
- API responses are not cached.
- Basic security headers and a restrictive Content Security Policy are applied.
- Authentication attempts are rate limited per hashed client address.

Before public launch, complete email verification and recovery, bot protection, stronger rate limiting, data deletion/export, moderation operations, privacy/legal documents, independent security testing and a production incident plan.

## Project structure

- `public/index.html` — application entry point
- `public/app.css` — responsive interface and design system
- `public/app.js` — client interactions and API integration
- `public/favicon.svg` — ELYVORA app icon
- `src/index.js` — Cloudflare Worker entry point and response headers
- `src/api.js` — account, social, messaging, career and economy API
- `migrations/0001_core.sql` — initial D1 database schema
- `wrangler.jsonc` — Cloudflare Workers and D1 configuration
- `package.json` — development, syntax checks and deployment scripts

The Worker ensures the versioned core schema exists on the first API request using its D1 binding. The SQL migration is also included for managed migration workflows.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Run syntax validation:

```bash
npm run check
```

## Deploy

```bash
npm run deploy
```

## Continuous deployment

Cloudflare Workers Builds is connected to `SuccessDaniel33/ELYVORA`:

- Production branch: `main`
- Root directory: `/`
- Build command: `npm run check`
- Deploy command: `npx wrangler deploy`

Every push to `main` runs the JavaScript syntax checks and deploys the Worker.

ELYVORA's implementation, interface and brand assets are developed independently.

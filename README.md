# ELYVORA

ELYVORA is an original social-world product concept: a global place to connect, share, discover places, develop careers and participate in a simulated digital economy.

This repository currently contains the first interactive web prototype. It is designed as a mobile-friendly application experience rather than a marketing-only landing page.

## Current prototype

- Responsive application shell with desktop sidebar and mobile navigation
- Home feed with demo stories, post publishing, reactions and profile editing
- Discover view for communities, places and career categories
- Visual world exploration concept with Lagos, London and Tokyo destinations
- Local demo conversations and message composer
- Career activity simulations and virtual-credit rewards
- Virtual wallet, activity ledger and property-acquisition simulation
- Browser-local persistence using localStorage

## Important prototype boundaries

The current prototype is client-side and uses sample identities and sample content. Activity is stored in the visitor's browser only. It does **not** yet provide production user registration, cross-user real-time messaging, media upload storage, voice notes, audio/video calling, live geolocation, real job listings, payment processing, cash-out, cryptocurrency, or legally recognized property ownership.

Those features require production services and careful security, privacy, moderation, identity, payment, and legal design. Demo credits are not money and cannot be redeemed.

## Project structure

- `public/index.html` — application entry point
- `public/app.css` — responsive interface and design system
- `public/app.js` — prototype interactions and local demo state
- `public/favicon.svg` — ELYVORA app icon
- `src/index.js` — Cloudflare Worker entry point and response headers
- `wrangler.jsonc` — Cloudflare Workers configuration
- `package.json` — local development and deployment scripts

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

## Deploy

```bash
npm run deploy
```

## Continuous deployment

Cloudflare Workers Builds is connected to `SuccessDaniel33/ELYVORA`:

- Production branch: `main`
- Root directory: `/`
- Build command: none (the static assets are deployed directly)
- Deploy command: `npx wrangler deploy`

Every push to `main` triggers a Cloudflare production build and deployment.

## Roadmap

1. Production authentication, account recovery and secure profiles
2. Backend database, file storage and moderation/reporting tools
3. Shared social feed, follows, comments and notifications
4. Real-time messaging, media sharing and voice notes
5. Audio/video calling and presence
6. Interactive maps, location discovery and world experiences
7. Career profiles, verified opportunities and business tools
8. Auditable virtual economy and property simulation
9. Production testing, accessibility, security review and mobile apps

ELYVORA is an original product. Its implementation, interface and brand assets are developed independently.

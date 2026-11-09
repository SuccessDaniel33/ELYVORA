# ELYVORA

A lightweight, responsive brand landing page deployed on Cloudflare Workers with Workers Static Assets.

## Project structure

- `public/index.html` — the website
- `src/index.js` — Worker entry point and browser security headers
- `wrangler.jsonc` — Cloudflare Workers configuration
- `package.json` — local development and deployment scripts

## Local development

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

## Deploy

Authenticate Wrangler with your Cloudflare account, then run:

```bash
npx wrangler login
npm run deploy
```

The Worker is named `elyvora` and is served on the account's `workers.dev` subdomain.

## Git-based deployments

Cloudflare Workers Builds is connected to this repository:

- GitHub repository: `SuccessDaniel33/ELYVORA`
- Production branch: `main`
- Root directory: `/`
- Build command: none (this project deploys directly)
- Deploy command: `npx wrangler deploy`

Every push to `main` triggers a Cloudflare production build and deployment.

## Project note

This first pass is a brand-led landing page because the repository did not include a product brief. Replace the general introduction and principles with the actual ELYVORA product, audience, and services before treating the copy as final.

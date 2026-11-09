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

The Worker is named `elyvora` and will be available on the account's `workers.dev` subdomain after deployment.

## Git-based deployments

The repository is prepared for Cloudflare Workers Builds. Connect the GitHub repository `SuccessDaniel33/ELYVORA` to the `elyvora` Worker, select `main` as the production branch, and use `npx wrangler deploy` as the deploy command. Pushes to the connected branch will then trigger deployments.

## Project note

This first pass is a brand-led landing page because the repository did not include a product brief. Replace the general introduction and principles with the actual ELYVORA product, audience, and services before treating the copy as final.

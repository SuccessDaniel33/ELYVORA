# ELYVORA

ELYVORA is an original global social-world platform: a place to connect, share, discover a Lagos-inspired city, develop careers and participate in a simulated digital economy.

The app combines a social feed and private messaging with a city/world interface and a life-simulation layer. It is independently designed and implemented; it does not use LagosLife's source code, brand identity or proprietary assets.

## Implemented in this release

- Responsive web application with a warm, city-inspired visual system and original ELYVORA city-map illustration
- Home social feed with posts, reactions and comments
- Account registration, sign-in and D1-backed member profiles
- Member search, following and notifications
- Private conversations with persistent text messages and per-conversation WebSocket delivery
- Image and video post uploads and chat attachments
- Voice-note recording with browser MediaRecorder and persistent chat delivery
- One-to-one browser voice and video calls using WebRTC with Durable Object signaling
- City exploration view with Lagos-inspired districts and destination concepts
- My Life view with character overview and six local demo needs
- Career listings and authenticated applications
- Persistent simulated wallet, transaction ledger and virtual property acquisitions
- GitHub-triggered Cloudflare Workers Builds from the `main` branch

## Accounts, profiles and privacy

- Registration collects a full name, unique username, email, password and country; city is optional.
- Passwords are PBKDF2-derived with per-user random salts. Sessions use opaque random tokens stored as SHA-256 hashes and delivered in HttpOnly, SameSite cookies.
- Members can manage their biography, username, country, city, interests, profile photo and cover image.
- Account privacy controls cover profile visibility, content visibility, message access, comments, online-status visibility and read receipts.
- Follow/unfollow, public profile pages, reporting, blocking and blocked-member management are available.
- Profile photos and cover images use the current private media upload path and are limited to 1 MB each while R2 is unavailable.
- Email verification and password recovery use one-time hashed tokens. To enable actual email delivery, configure the Cloudflare Worker environment with a Resend API secret named `RESEND_API_KEY` and a verified sender address named `EMAIL_FROM`. Without those values, account registration and sign-in still work, but verification and password-reset emails cannot be delivered.

The account/privacy schema is version 3 and is included in `migrations/0003_accounts_privacy.sql`. Existing user rows are preserved and receive default profile/privacy records through idempotent migrations.

## Media storage limits

R2 is not currently enabled on the connected Cloudflare account. Until it is activated, this release uses a bounded D1-backed media store for small files:

- Supported images: JPEG, PNG, WebP, GIF and AVIF
- Supported video: MP4, WebM and QuickTime
- Supported audio: WebM, OGG, MP4 and MPEG
- Maximum upload size: 1 MB per file

D1 is not the intended storage layer for a large social media platform. Enable an R2 subscription in Cloudflare Dashboard → Storage & databases → R2 → Overview, then create and bind an R2 bucket and migrate media objects before increasing upload limits. Cloudflare documents R2 activation through the Dashboard: https://developers.cloudflare.com/r2/get-started/

## Voice and video call notes

- One-to-one calls use the browser's microphone/camera and WebRTC peer connections.
- Signaling is authenticated and routed through a conversation-specific Durable Object WebSocket.
- Both members must be signed in, have the same conversation open and grant the browser's media permissions.
- This initial implementation uses public STUN servers. Some restrictive corporate, mobile-carrier or symmetric-NAT networks require a TURN relay; production call reliability needs a managed TURN service or a suitable SFU.
- Group calling, call history, incoming-call presence across unopened conversations, screen sharing and background-call support are not implemented yet.

## City and life simulation notes

The current map is an original illustrated Lagos-inspired city concept with initial district labels. It is not a live street map or a walkable 3D world yet. Live geolocation, route planning, 3D environments, city venues, shared events and persistent simulation time remain later development stages.

The My Life needs meters are a local browser simulation preview. A persistent character system with server-backed needs, inventory, transport, housing and world time has not been completed.

## Economy and jobs

Career listings and applications are starter platform data. Employer onboarding, verification, contracts, payroll and real compensation are not implemented.

ELYVORA credits and property are simulated in-app data. They are not money, cryptocurrency, deposits, investments or legally recognized real estate, and cannot be redeemed for cash.

## Security and privacy foundation

- Passwords use PBKDF2-derived hashes with per-account random salts.
- Sessions are opaque random tokens stored as SHA-256 hashes in D1 and delivered in HttpOnly, SameSite cookies.
- Mutating API calls require a same-origin Origin header.
- Conversation WebSockets are opened only after the Worker verifies the signed-in member belongs to the conversation.
- Uploaded media is private until referenced by a public post or a conversation message.
- Basic security headers, a restrictive Content Security Policy and authentication rate limits are applied.

Before broad public launch, complete email verification and recovery, bot protection, more comprehensive rate limiting, data deletion/export, moderation operations, privacy/legal documents, independent security testing, TURN/SFU capacity planning and a production incident plan.

## Project structure

- `public/index.html` — app entry point
- `public/app.css` — responsive design system and city visual language
- `public/app.js` — app navigation, social interactions, media uploads and WebRTC client
- `public/city-map.svg` — original ELYVORA city illustration
- `public/favicon.svg` — ELYVORA icon
- `src/index.js` — Cloudflare Worker entry point and security headers
- `src/api.js` — auth, profiles, social, media, chat, career and economy API
- `src/chat-room.js` — per-conversation Durable Object for text delivery and WebRTC signaling
- `migrations/0001_core.sql` — core D1 schema
- `migrations/0002_media.sql` — media table migration
- `wrangler.jsonc` — Workers, D1 and Durable Object configuration

The Worker applies the current schema version through its D1 binding when the API is first called. SQL migrations are also included for managed migration workflows.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Syntax validation:

```bash
npm run check
```

Deploy:

```bash
npm run deploy
```

## Continuous deployment

Cloudflare Workers Builds is connected to `SuccessDaniel33/ELYVORA`:

- Production branch: `main`
- Root directory: `/`
- Build command: `npm run check`
- Deploy command: `npx wrangler deploy`

Every push to `main` runs JavaScript syntax validation before deploying the Worker.

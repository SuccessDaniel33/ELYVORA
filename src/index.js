import { ChatRoom } from "./chat-room.js";
export { ChatRoom };

/**
 * ELYVORA Cloudflare Worker.
 * API routes are handled by the Worker; the application shell is served
 * through Workers Static Assets.
 */
import { handleApi } from "./api.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let response;

    if (url.pathname.startsWith("/api/")) {
      response = await handleApi(request, env);
    } else if (env.ASSETS) {
      response = await env.ASSETS.fetch(request);
    } else {
      response = new Response("ELYVORA assets are not configured.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    if (!response) response = new Response("Not found", { status: 404 });

    const headers = new Headers(response.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("X-Frame-Options", "DENY");
    headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(self)");
    headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' https: data: blob:; connect-src 'self'; media-src 'self' blob: https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("X-Permitted-Cross-Domain-Policies", "none");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};

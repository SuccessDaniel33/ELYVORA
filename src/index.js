/**
 * ELYVORA Cloudflare Worker
 *
 * Serves the application through Workers Static Assets and applies
 * baseline browser security and feature-permission headers.
 */
export default {
  async fetch(request, env) {
    if (!env.ASSETS) {
      return new Response("ELYVORA assets are not configured.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);

    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("X-Frame-Options", "DENY");
    // These capabilities are available to this origin only and still
    // require explicit browser/user permission before use.
    headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(self)");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};

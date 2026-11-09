import { DurableObject } from "cloudflare:workers";

/**
 * One real-time coordinator per ELYVORA conversation.
 * D1 remains the source of truth; this object only fans out committed events.
 */
export class ChatRoom extends DurableObject {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/connect") {
      if (request.method !== "GET" || request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
        return new Response("Expected a WebSocket upgrade.", { status: 426 });
      }

      const userId = request.headers.get("X-Elyvora-User-Id");
      if (!userId) return new Response("Unauthorized.", { status: 401 });

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      server.serializeAttachment({ userId, connectedAt: Date.now() });
      this.ctx.acceptWebSocket(server, ["members"]);
      server.send(JSON.stringify({ type: "connected" }));

      return new Response(null, { status: 101, webSocket: client });
    }

    // This endpoint is called only through the private Worker binding after a
    // message has been committed to D1. The namespace is not publicly routed.
    if (url.pathname === "/broadcast" && request.method === "POST") {
      const raw = await request.text();
      if (raw.length > 12000) return new Response("Event too large.", { status: 413 });
      let event;
      try { event = JSON.parse(raw); } catch { return new Response("Invalid event.", { status: 400 }); }

      const payload = JSON.stringify(event);
      let delivered = 0;
      for (const socket of this.ctx.getWebSockets("members")) {
        if (socket.readyState !== WebSocket.OPEN) continue;
        try {
          socket.send(payload);
          delivered += 1;
        } catch (error) {
          console.warn("ELYVORA chat broadcast failed:", error);
        }
      }
      return Response.json({ delivered });
    }

    return new Response("Not found.", { status: 404 });
  }

  async webSocketMessage(socket, message) {
    // Clients may send lightweight keep-alives only; message content is always
    // persisted through the authenticated API before it is broadcast to peers.
    if (message === "ping") {
      try { socket.send("pong"); } catch {}
    }
  }

  async webSocketClose() {
    // Hibernatable WebSockets are closed by the runtime after the close frame.
  }

  async webSocketError(socket, error) {
    console.warn("ELYVORA chat socket error:", error);
  }
}

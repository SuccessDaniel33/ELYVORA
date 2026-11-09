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
    if (message === "ping") {
      try { socket.send("pong"); } catch {}
      return;
    }
    if (typeof message !== "string" || message.length > 32_000) return;

    let incoming;
    try { incoming = JSON.parse(message); } catch { return; }
    const sender = socket.deserializeAttachment();
    if (!sender?.userId) return;

    const allowed = new Set(["call-offer","call-answer","call-ice","call-reject","call-hangup","call-busy"]);
    if (!allowed.has(incoming?.type)) return;
    if (typeof incoming.callId !== "string" || incoming.callId.length > 80) return;

    const event = { type: incoming.type, callId: incoming.callId, fromUserId: sender.userId };
    if (incoming.targetUserId && typeof incoming.targetUserId === "string") event.targetUserId = incoming.targetUserId;

    if (incoming.type === "call-offer") {
      if (!["audio","video"].includes(incoming.kind)) return;
      if (!incoming.description || incoming.description.type !== "offer" || typeof incoming.description.sdp !== "string" || incoming.description.sdp.length > 24_000) return;
      event.kind = incoming.kind;
      event.description = incoming.description;
    } else if (incoming.type === "call-answer") {
      if (!incoming.description || incoming.description.type !== "answer" || typeof incoming.description.sdp !== "string" || incoming.description.sdp.length > 24_000) return;
      event.description = incoming.description;
    } else if (incoming.type === "call-ice") {
      const candidate = incoming.candidate;
      if (!candidate || typeof candidate.candidate !== "string" || candidate.candidate.length > 4_000) return;
      event.candidate = candidate;
    } else if (incoming.type === "call-reject" || incoming.type === "call-busy") {
      event.reason = incoming.type === "call-busy" ? "busy" : "rejected";
    }

    const payload = JSON.stringify(event);
    for (const peer of this.ctx.getWebSockets("members")) {
      if (peer === socket || peer.readyState !== WebSocket.OPEN) continue;
      const recipient = peer.deserializeAttachment();
      if (!recipient?.userId || recipient.userId === sender.userId) continue;
      if (event.targetUserId && recipient.userId !== event.targetUserId) continue;
      try { peer.send(payload); } catch (error) { console.warn("ELYVORA call signal delivery failed:", error); }
    }
  }

  async webSocketClose() {
    // Hibernatable WebSockets are closed by the runtime after the close frame.
  }

  async webSocketError(socket, error) {
    console.warn("ELYVORA chat socket error:", error);
  }
}

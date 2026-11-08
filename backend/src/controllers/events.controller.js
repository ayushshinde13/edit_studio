import { store } from "../services/store.js";
import { isDbConnected } from "../config/db.js";
import { Event } from "../models/Event.model.js";

export async function trackEvents(req, res) {
  const payload = req.body;
  const eventList = Array.isArray(payload?.events)
    ? payload.events
    : payload?.action
    ? [payload]
    : [];

  const client = req.clientInfo;

  let addedCount = 0;
  for (const item of eventList) {
    const eventPayload = {
      session_hash: item.session_hash || item.sessionId || "anon",
      ip_hash: client.ipHash,
      ip_masked: client.ipMasked,
      country_code: client.countryCode,
      city: client.city,
      category: item.category || "general",
      tool: item.tool || "General",
      action: item.action || "open",
      ok: item.ok !== false,
      error_type: item.error_type || null,
      device_class: item.device_class || client.deviceClass,
      os: item.os || client.os,
      browser: item.browser || client.browser,
      webgpu_supported: Boolean(item.webgpu_supported),
      backend_used: item.backend_used || "wasm",
      metadata: item.metadata || {},
    };

    const recorded = store.addEvent(eventPayload);
    if (recorded) addedCount++;

    if (isDbConnected()) {
      Event.create({
        eventId: recorded ? recorded.id : `evt-${Date.now()}`,
        ts: new Date(),
        sessionHash: eventPayload.session_hash,
        ipHash: eventPayload.ip_hash,
        ipMasked: eventPayload.ip_masked,
        countryCode: eventPayload.country_code,
        city: eventPayload.city,
        category: eventPayload.category,
        tool: eventPayload.tool,
        action: eventPayload.action,
        ok: eventPayload.ok,
        errorType: eventPayload.error_type,
        deviceClass: eventPayload.device_class,
        os: eventPayload.os,
        browser: eventPayload.browser,
        webgpuSupported: eventPayload.webgpu_supported,
        backendUsed: eventPayload.backend_used,
        metadata: eventPayload.metadata,
      }).catch((e) => console.error("MongoDB event save error:", e.message));
    }
  }

  res.status(200).json({ success: true, count: addedCount });
}


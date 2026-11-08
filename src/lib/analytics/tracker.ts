"use client";

export type EventAction = "page_view" | "tool_open" | "tool_process" | "tool_export" | "tool_error" | "capability_check";

export interface AnalyticsEvent {
  action: EventAction;
  category?: "audio" | "image" | "video" | "general";
  tool?: string;
  ok?: boolean;
  error_type?: string;
  backend_used?: "webgpu" | "wasm";
  metadata?: Record<string, any>;
  session_hash?: string;
}

class AnalyticsTracker {
  private queue: AnalyticsEvent[] = [];
  private sessionHash: string = "";
  private flushTimer: any = null;
  private isOptedOut: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      // Memory-only session ID (no tracking cookies)
      this.sessionHash = "s_" + Math.random().toString(36).substring(2, 12);
      // Respect Do Not Track or in-app opt-out
      const dnt = navigator.doNotTrack === "1" || (window as any).doNotTrack === "1";
      const localOptOut = localStorage.getItem("edito_opt_out") === "true";
      this.isOptedOut = dnt || localOptOut;

      window.addEventListener("beforeunload", () => this.flush());
    }
  }

  public setOptOut(optOut: boolean) {
    this.isOptedOut = optOut;
    if (typeof window !== "undefined") {
      localStorage.setItem("edito_opt_out", optOut ? "true" : "false");
    }
  }

  public getOptOut(): boolean {
    return this.isOptedOut;
  }

  public track(event: Omit<AnalyticsEvent, "session_hash">) {
    if (this.isOptedOut) return;

    // Sanitize metadata: No file names, contents, or user text per PRD 17.8
    const sanitizedMetadata = { ...event.metadata };
    delete sanitizedMetadata.filename;
    delete sanitizedMetadata.name;
    delete sanitizedMetadata.text;
    delete sanitizedMetadata.query;

    this.queue.push({
      ...event,
      session_hash: this.sessionHash,
      metadata: sanitizedMetadata,
    });

    if (this.queue.length >= 5) {
      this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), 3500);
    }
  }

  public flush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.queue.length === 0 || this.isOptedOut) return;

    const payload = JSON.stringify({ events: this.queue });
    this.queue = [];

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/v1/events", blob);
    } else if (typeof fetch !== "undefined") {
      fetch("/api/v1/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  }
}

export const analytics = new AnalyticsTracker();


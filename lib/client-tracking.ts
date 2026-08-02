"use client";

import type { AnalyticsEventType } from "@/generated/prisma/enums";

const SESSION_KEY = "wbsite.session-id";

export function getSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export function trackClient(
  eventType: AnalyticsEventType | string,
  data: {
    eventName?: string;
    pagePath?: string | null;
    referrer?: string | null;
    productId?: string | null;
    orderId?: string | null;
    value?: number | null;
    metadata?: Record<string, unknown> | null;
  } = {},
): void {
  if (typeof navigator === "undefined" || typeof fetch === "undefined") return;

  const payload = {
    sessionId: getSessionId(),
    eventType,
    eventName: data.eventName,
    pagePath: data.pagePath ?? (typeof location !== "undefined" ? location.pathname + location.search : null),
    referrer: data.referrer ?? (typeof document !== "undefined" ? document.referrer || null : null),
    productId: data.productId ?? null,
    orderId: data.orderId ?? null,
    value: data.value ?? null,
    metadata: data.metadata ?? null,
  };

  try {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // fire-and-forget
  }
}

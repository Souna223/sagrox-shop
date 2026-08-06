"use client";

import type { AnalyticsEventType } from "@/generated/prisma/enums";

const SESSION_KEY = "wbsite.session-id";
const UTM_KEY = "wbsite.utm";
const REFERRER_KEY = "wbsite.referrer";

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

type Attribution = {
  utm: Record<string, string | null>;
  referrer: string | null;
};

function emptyUtm(): Record<string, string | null> {
  return {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
  };
}

export function getAttribution(urlSearch: URLSearchParams | null): Attribution {
  let utm: Record<string, string | null> = emptyUtm();
  let referrer: string | null = null;

  try {
    const stored = sessionStorage.getItem(UTM_KEY);
    if (stored) utm = { ...emptyUtm(), ...JSON.parse(stored) };

    const fresh = {
      utm_source: urlSearch?.get("utm_source") ?? null,
      utm_medium: urlSearch?.get("utm_medium") ?? null,
      utm_campaign: urlSearch?.get("utm_campaign") ?? null,
      utm_content: urlSearch?.get("utm_content") ?? null,
      utm_term: urlSearch?.get("utm_term") ?? null,
    };
    if (Object.values(fresh).some(Boolean)) {
      utm = fresh;
      sessionStorage.setItem(UTM_KEY, JSON.stringify(fresh));
    }

    const docReferrer = typeof document !== "undefined" ? document.referrer || null : null;
    const storedReferrer = sessionStorage.getItem(REFERRER_KEY);
    if (docReferrer) {
      referrer = docReferrer;
      sessionStorage.setItem(REFERRER_KEY, docReferrer);
    } else if (storedReferrer) {
      referrer = storedReferrer;
    }
  } catch {
    utm = {
      utm_source: urlSearch?.get("utm_source") ?? null,
      utm_medium: urlSearch?.get("utm_medium") ?? null,
      utm_campaign: urlSearch?.get("utm_campaign") ?? null,
      utm_content: urlSearch?.get("utm_content") ?? null,
      utm_term: urlSearch?.get("utm_term") ?? null,
    };
    referrer = typeof document !== "undefined" ? document.referrer || null : null;
  }

  return { utm, referrer };
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

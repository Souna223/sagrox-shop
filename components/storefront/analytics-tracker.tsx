"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { trackClient } from "@/lib/client-tracking";

function Tracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const trackedRef = useRef<string | null>(null);

  useEffect(() => {
    const full = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    if (trackedRef.current === full) return;
    trackedRef.current = full;

    const params = new URLSearchParams(searchParams?.toString() ?? "");
    trackClient("PAGE_VIEW", {
      pagePath: full,
      metadata: {
        utm_source: params.get("utm_source"),
        utm_medium: params.get("utm_medium"),
        utm_campaign: params.get("utm_campaign"),
        utm_content: params.get("utm_content"),
        utm_term: params.get("utm_term"),
      },
    });
  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsTracker() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  );
}

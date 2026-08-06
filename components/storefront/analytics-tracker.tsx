"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { trackClient, getAttribution } from "@/lib/client-tracking";

function Tracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const trackedRef = useRef<string | null>(null);

  useEffect(() => {
    const full = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    if (trackedRef.current === full) return;
    trackedRef.current = full;

    const params = new URLSearchParams(searchParams?.toString() ?? "");
    const { utm, referrer } = getAttribution(params);
    trackClient("PAGE_VIEW", {
      pagePath: full,
      referrer,
      metadata: { ...utm },
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

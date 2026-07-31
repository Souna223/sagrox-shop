"use client";

import { useState } from "react";
import { Megaphone, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnnouncementsSection } from "@/components/admin/announcements-section";
import { FaqsSection } from "@/components/admin/faqs-section";
import type { SerializedAnnouncement, SerializedFaq } from "@/lib/admin-content";

type ContentTabsProps = {
  announcements: {
    items: SerializedAnnouncement[];
    total: number;
    page: number;
    totalPages: number;
  };
  faqs: { items: SerializedFaq[]; total: number };
  announcementsQ: string;
  announcementsActive: string;
};

type Tab = "announcements" | "faqs";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "announcements", label: "Anúncios", icon: Megaphone },
  { id: "faqs", label: "FAQ", icon: HelpCircle },
];

export function ContentTabs({ announcements, faqs, announcementsQ, announcementsActive }: ContentTabsProps) {
  const [tab, setTab] = useState<Tab>("announcements");

  return (
    <div className="space-y-6">
      <div className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "announcements" ? (
        <AnnouncementsSection
          initial={announcements}
          q={announcementsQ}
          active={announcementsActive}
        />
      ) : (
        <FaqsSection initial={faqs} />
      )}
    </div>
  );
}

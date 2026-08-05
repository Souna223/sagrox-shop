import { WhatsAppIcon } from "@/components/icons";
import { getDictionary } from "@/lib/i18n/server";

export async function WhatsAppWidget({ whatsapp }: { whatsapp: string }) {
  const t = await getDictionary();
  const digits = whatsapp.replace(/\D/g, "");
  if (!digits) return null;

  return (
    <a
      href={`https://wa.me/${digits}?text=${encodeURIComponent(t.whatsapp.defaultMessage)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t.whatsapp.tooltip}
      title={t.whatsapp.tooltip}
      className="fixed bottom-4 right-4 z-50 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-emerald-600/30 transition-transform hover:scale-110 active:scale-95 sm:size-12 sm:bottom-5 sm:right-5"
    >
      <WhatsAppIcon className="size-8 sm:size-7" />
    </a>
  );
}

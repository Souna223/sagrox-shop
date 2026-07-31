import Link from "next/link";
import Image from "next/image";
import {
  Mail,
  MapPin,
  Phone,
  Clock,
  Lock,
  ShieldCheck,
} from "lucide-react";
import {
  InstagramIcon,
  FacebookIcon,
  TikTokIcon,
  WhatsAppIcon,
} from "@/components/icons";
import type { SiteSettings } from "@/lib/settings";
import { getDictionary } from "@/lib/i18n/server";

export async function Footer({ settings }: { settings: SiteSettings }) {
  const year = new Date().getFullYear();
  const t = await getDictionary();

  return (
    <footer className="mt-auto border-t bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2" aria-label={t.footer.storeLink}>
              <Image
                src="/logo.png"
                alt={settings.storeName}
                width={1406}
                height={768}
                className="h-8 w-auto object-contain"
              />
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">{settings.storeDescription}</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="size-4" /> {t.footer.securePurchase}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4" /> {t.footer.dataProtection}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">{t.footer.institutional}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/sobre" className="hover:text-foreground">{t.footer.aboutUs}</Link></li>
              <li><Link href="/contato" className="hover:text-foreground">{t.footer.contact}</Link></li>
              <li><Link href="/faq" className="hover:text-foreground">{t.footer.faq}</Link></li>
              <li><Link href="/trocas-devolucoes" className="hover:text-foreground">{t.footer.returns}</Link></li>
              <li><Link href="/rastrear-pedido" className="hover:text-foreground">{t.footer.trackOrder}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">{t.footer.help}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/politica-privacidade" className="hover:text-foreground">{t.footer.privacyPolicy}</Link></li>
              <li><Link href="/termos-de-uso" className="hover:text-foreground">{t.footer.termsOfUse}</Link></li>
              <li><Link href="/politica-privacidade" className="hover:text-foreground">{t.footer.lgpd}</Link></li>
              <li><Link href="/produtos" className="hover:text-foreground">{t.footer.allProducts}</Link></li>
              <li><Link href="/promocoes" className="hover:text-foreground">{t.footer.promotions}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">{t.footer.support}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {settings.whatsapp ? (
                <li className="flex items-center gap-2">
                  <WhatsAppIcon className="size-4" />
                  <a href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`} className="hover:text-foreground">
                    WhatsApp
                  </a>
                </li>
              ) : null}
              {settings.phone ? (
                <li className="flex items-center gap-2">
                  <Phone className="size-4" /> {settings.phone}
                </li>
              ) : null}
              {settings.email ? (
                <li className="flex items-center gap-2">
                  <Mail className="size-4" /> {settings.email}
                </li>
              ) : null}
              {settings.address ? (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4" /> {settings.address}
                </li>
              ) : null}
              {settings.businessHours ? (
                <li className="flex items-center gap-2">
                  <Clock className="size-4" /> {settings.businessHours}
                </li>
              ) : null}
            </ul>
            <div className="mt-4 flex gap-3">
              {settings.instagram ? (
                <a href={settings.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-muted-foreground hover:text-foreground">
                  <InstagramIcon className="size-5" />
                </a>
              ) : null}
              {settings.facebook ? (
                <a href={settings.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-muted-foreground hover:text-foreground">
                  <FacebookIcon className="size-5" />
                </a>
              ) : null}
              {settings.tiktok ? (
                <a href={settings.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="text-muted-foreground hover:text-foreground">
                  <TikTokIcon className="size-5" />
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {year} {settings.storeName}. {t.footer.rightsReserved}
          </p>
          <p>{t.footer.paymentsVia}</p>
        </div>
      </div>
    </footer>
  );
}

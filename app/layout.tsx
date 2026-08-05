import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AnalyticsScripts } from "@/components/tracking/scripts";
import { SITE_NAME, SITE_URL } from "@/lib/constants";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Compre online com as melhores ofertas`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Compre online com pagamento em até 12x, Pix, boleto e entrega para todo o Brasil. Ofertas exclusivas, frete rápido e compra 100% segura.",
  keywords: ["e-commerce", "loja online", "comprar online", "ofertas", "frete grátis"],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: "Compre online com as melhores ofertas do Brasil.",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: "Compre online com as melhores ofertas do Brasil.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${inter.variable} ${sora.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AnalyticsScripts />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

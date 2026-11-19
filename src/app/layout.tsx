import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { NO_FLASH_DISPLAY_SCRIPT } from "@/lib/ui/display";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

const SITE_URL = "https://trazzo-jade.vercel.app";
const TITLE = "TRAZO · Del estudio a la obra";
const DESCRIPTION =
  "TRAZO, del estudio a la obra: normativa RNE, calculadoras y metrados offline-first para arquitectura y obra en Perú.";
/** Link previews (WhatsApp, Telegram, social): built from assets/logo.png by `npm run og`. */
const PREVIEWS = [
  {
    url: SITE_URL + "/og-image.png",
    width: 1200,
    height: 630,
    type: "image/png",
    alt: "TRAZO · Del estudio a la obra",
  },
  {
    url: SITE_URL + "/og-square.png",
    width: 512,
    height: 512,
    type: "image/png",
    alt: "Logo de TRAZO",
  },
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  applicationName: "TRAZO",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "es_PE",
    url: SITE_URL,
    siteName: "TRAZO",
    title: TITLE,
    description: DESCRIPTION,
    images: PREVIEWS,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [PREVIEWS[0]],
  },
  appleWebApp: { title: "TRAZO" },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#121316" },
    { media: "(prefers-color-scheme: light)", color: "#F6F5F2" },
  ],
  width: "device-width",
  initialScale: 1,
  // Lets env(safe-area-inset-*) report the notch and home bar: the header and the
  // bottom navigation pad themselves with those values (iOS standalone, notches).
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_DISPLAY_SCRIPT }} />
      </head>
      <body className={inter.variable + " " + mono.variable}>{children}</body>
    </html>
  );
}

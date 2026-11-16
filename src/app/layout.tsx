import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "TRAZZO · RNE Pro Perú",
  description: "Normativa, calculadoras y metrados offline-first para arquitectura y obra en Perú.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
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
};

const noFlashTheme = [
  "try {",
  '  const theme = localStorage.getItem("trazzo-theme");',
  '  document.documentElement.classList.toggle("dark", theme !== "light");',
  "} catch (_) {}",
].join("\n");

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashTheme }} />
      </head>
      <body className={inter.variable + " " + mono.variable}>{children}</body>
    </html>
  );
}

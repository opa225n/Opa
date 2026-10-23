import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "Tontine CI — Gestion de tontines",
  description:
    "Cotisations, calendrier des tours, paiements et rapports pour vos tontines, en franc CFA.",
  icons: {
    // Paramètre de version pour casser le cache favicon des navigateurs (très agressif) après
    // un changement d'icône : incrémenter à chaque nouvelle mise à jour du logo.
    icon: [
      { url: "/icon.svg?v=2", type: "image/svg+xml" },
      { url: "/favicon.ico?v=2", sizes: "any" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // Paramètre de version pour casser le cache du manifeste PWA (même principe que l'icône
  // ci-dessus) : incrémenter à chaque changement de start_url/icônes, sinon un appareil qui a
  // déjà "ajouté à l'écran d'accueil" garde l'ancien manifeste en cache indéfiniment.
  manifest: "/manifest.webmanifest?v=2",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tontine CI",
  },
};

export const viewport: Viewport = {
  themeColor: "#3b1530",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}

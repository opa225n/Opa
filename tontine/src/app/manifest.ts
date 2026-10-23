import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tontine CI — Gestion de tontines",
    short_name: "Tontine CI",
    description:
      "Cotisations, calendrier des tours, paiements et rapports pour vos tontines, en franc CFA.",
    start_url: "/inscription",
    scope: "/",
    display: "standalone",
    background_color: "#f7f3ea",
    theme_color: "#3b1530",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

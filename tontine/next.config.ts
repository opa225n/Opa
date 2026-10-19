import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Cache Components désactivé intentionnellement : chaque page de l'application manipule des
     données financières privées et scoppées à l'utilisateur authentifié (cf. src/lib/rbac.ts).
     Un cache de rendu partagé entre utilisateurs serait un risque de fuite de données. */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

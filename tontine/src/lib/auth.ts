import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  // Déploiement auto-hébergé derrière un reverse proxy / plateforme : l'hôte réel n'est
  // connu qu'au moment de la requête (pas de domaine fixe configuré ici). À documenter dans
  // le README pour une mise en production avec un domaine propre.
  trustHost: true,
  pages: {
    signIn: "/connexion",
  },
  providers: [
    Credentials({
      credentials: {
        phone: { label: "Téléphone", type: "text" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const phone = credentials?.phone;
        const password = credentials?.password;
        if (typeof phone !== "string" || typeof password !== "string") return null;

        const user = await prisma.user.findUnique({ where: { phone } });
        // Un membre "sans compte" (isManaged) n'a pas de vrai numéro ni de mot de passe utilisable :
        // il ne peut jamais se connecter lui-même, même si son identifiant interne fuitait.
        if (!user || user.deletedAt || user.isManaged) return null;
        if (user.isSuspended) {
          throw new Error("Ce compte a été suspendu. Contactez le support.");
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.fullName,
          email: user.email ?? undefined,
          phone: user.phone,
          platformRole: user.platformRole,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.phone = (user as { phone?: string }).phone;
        token.platformRole = (user as { platformRole?: string }).platformRole;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as typeof session.user & { phone?: string; platformRole?: string }).phone =
          token.phone as string | undefined;
        (session.user as typeof session.user & { phone?: string; platformRole?: string }).platformRole =
          token.platformRole as string | undefined;
      }
      return session;
    },
  },
});

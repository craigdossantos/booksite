import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  cookies: {
    pkceCodeVerifier: {
      name: "authjs.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true,
        maxAge: 60 * 15,
      },
    },
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        // Find or create DB user so session.user.id matches the database
        const email = profile.email ?? token.email;
        let dbUser = email
          ? await prisma.user.findUnique({ where: { email } })
          : null;

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              email,
              name: profile.name ?? token.name,
              image: (profile as { picture?: string }).picture ?? null,
            },
          });
        }

        token.dbUserId = dbUser.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.dbUserId) {
        session.user.id = token.dbUserId as string;
      }
      return session;
    },
  },
});

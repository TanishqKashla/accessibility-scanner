import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import connectMongo from "@/lib/db/connection";
import User from "@/lib/db/models/User";
import Organization from "@/lib/db/models/Organization";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.trim().toLowerCase();
        const password = credentials.password;

        // Check for admin env credentials first
        const adminEmail = process.env.ADMIN_ID?.trim().toLowerCase();
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
          await connectMongo();
          let user = await User.findOne({ email: adminEmail });
          if (!user) {
            const org = await Organization.create({ name: "Admin" });
            user = await User.create({
              email: adminEmail,
              role: "admin",
              orgId: org._id,
              name: "Admin",
            });
          }
          if (user.role !== "admin") {
            await User.findByIdAndUpdate(user._id, { role: "admin" });
          }
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name ?? null,
            orgId: user.orgId.toString(),
            role: "admin",
          };
        }

        // Normal DB login
        await connectMongo();

        const user = await User.findOne({ email });

        if (!user || !user.hashedPassword) return null;

        const isValid = await bcrypt.compare(password, user.hashedPassword);
        if (!isValid) return null;

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name ?? null,
          orgId: user.orgId.toString(),
          role: user.role,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        await connectMongo();

        const existingUser = await User.findOne({ email: profile.email });

        if (!existingUser) {
          const orgName = profile.email.split("@")[1] || "Default Org";
          const organization = await Organization.create({ name: orgName });

          await User.create({
            email: profile.email,
            googleId: account.providerAccountId,
            role: "viewer",
            orgId: organization._id,
            name: profile.name ?? undefined,
          });
        } else if (!existingUser.googleId) {
          await User.findByIdAndUpdate(existingUser._id, {
            googleId: account.providerAccountId,
          });
        }
      }
      return true;
    },

    async jwt({ token, user, account }) {
      // On initial sign-in user object is populated
      if (user) {
        token.userId = user.id;
        token.orgId = (user as { orgId?: string }).orgId;
        token.role = (user as { role?: string }).role;
      }

      // For Google sign-in, fetch user details from DB on first JWT creation
      if (account?.provider === "google" && token.email) {
        await connectMongo();
        const dbUser = await User.findOne({ email: token.email }).lean();
        if (dbUser) {
          token.userId = (dbUser._id as { toString(): string }).toString();
          token.orgId = (dbUser.orgId as { toString(): string }).toString();
          token.role = dbUser.role;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.orgId = token.orgId as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

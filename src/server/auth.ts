import { type SolidAuthConfig } from "@auth/solid-start";
import Google from "@auth/solid-start/providers/google";
import CredentialsProvider from "@auth/solid-start/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { serverEnv } from "~/env/server";
import { db } from "~/lib/db";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import type { User as AuthUser } from "@auth/core/types";

declare module "@auth/core/types" {
    interface Session {
        user: {
            id: string;
            role: string;
            twoFactorEnabled: boolean;
            isTwoFactorAuthenticated: boolean;
        } & AuthUser;
    }
    interface User {
        role?: string | null;
        twoFactorEnabled?: boolean | null;
    }
}

declare module "@auth/core/jwt" {
    interface JWT {
        id?: string;
        role?: string;
        twoFactorEnabled?: boolean;
        isTwoFactorAuthenticated?: boolean;
    }
}

export const authOptions: SolidAuthConfig = {
    adapter: PrismaAdapter(db),
    basePath: "/api/auth",
    trustHost: true,
    providers: [
        Google({
            clientId: serverEnv.GOOGLE_CLIENT_ID!,
            clientSecret: serverEnv.GOOGLE_CLIENT_SECRET!,
        }),
        CredentialsProvider({
            authorize: async (credentials) => {
                const email = credentials.email as string;
                const password = credentials.password as string;
                const otp = credentials.otp as string | undefined;

                const user = await db.user.findUnique({
                    where: { email: email },
                });

                if (!user) {
                    throw new Error("Authorize: Utilisateur non trouvé")
                }

                const isValidPassword = bcrypt.compare(password, user.hashedPassword);
                if (!isValidPassword) {
                    throw new Error("Authorize: Mot de passe invalide");
                }

                if (user.role !== "USER") {
                    const isValidOTP = authenticator.verify({ token: otp, secret: user.twoFactorSecret });
                    if (!isValidOTP) {
                        throw new Error("Authorize: Code OTP invalide");
                    }
                }

                return {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    image: user.image,
                    twoFactorEnabled: user.twoFactorEnabled
                };
            },
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async signIn({ user, account, credentials }) {
            const dbUser = await db.user.findUnique({ where: { id: user.id } });

            if (!dbUser) return false;

            return true;
        },

        async jwt({ token, user, account, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.role = user.role;
                const dbUser = await db.user.findUnique({ where: { id: user.id } });
                token.twoFactorEnabled = !!dbUser?.twoFactorEnabled;

                if (account?.provider === "credentials" && token.twoFactorEnabled) {
                    token.isTwoFactorAuthenticated = true;
                } else if (account?.provider !== "credentials") {
                    token.isTwoFactorAuthenticated = true;
                } else {
                    token.isTwoFactorAuthenticated = false;
                }
            }

            if (trigger === "update" && session?.action === "USER_UPDATED_2FA_STATUS") {
                const dbUser = await db.user.findUnique({ where: { id: token.id as string } });
                if (dbUser) {
                    token.twoFactorEnabled = dbUser.twoFactorEnabled;
                    if (!dbUser.twoFactorEnabled) {
                        token.isTwoFactorAuthenticated = true;
                    }
                }
            }
            return token;
        },

        async session({ session, token }) {
            if (token.id) session.user.id = token.id as string;
            if (token.email) session.user.email = token.email;
            if (token.role) session.user.role = token.role as string;
            session.user.twoFactorEnabled = !!token.twoFactorEnabled;
            session.user.isTwoFactorAuthenticated = !!token.isTwoFactorAuthenticated;

            return session;
        },
    },
    debug: serverEnv.NODE_ENV === "development",
};

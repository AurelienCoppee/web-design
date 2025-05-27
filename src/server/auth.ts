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
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                otp: { label: "One-Time Password", type: "text" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials.password) {
                    console.error("Authorize: Email ou mot de passe manquant");
                    return null;
                }

                const email = credentials.email as string;
                const password = credentials.password as string;
                const otp = credentials.otp as string | undefined;

                const user = await db.user.findUnique({
                    where: { email: email },
                });

                if (!user || !user.hashedPassword) {
                    console.error("Authorize: Utilisateur non trouvé ou pas de mot de passe haché");
                    return null;
                }

                const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
                if (!isValidPassword) {
                    console.error("Authorize: Mot de passe invalide");
                    return null;
                }

                if (!user.twoFactorEnabled || !user.twoFactorSecret) {
                    console.error("Authorize: 2FA non activée ou secret manquant pour un utilisateur existant.");
                    return null;
                }

                if (!otp) {
                    console.error("Authorize: Code OTP manquant pour la connexion 2FA");
                    return null;
                }

                const isValidOTP = authenticator.verify({ token: otp, secret: user.twoFactorSecret });
                if (!isValidOTP) {
                    console.error("Authorize: Code OTP invalide");
                    return null;
                }

                console.log("Authorize: Connexion réussie pour", user.email);
                return {
                    id: user.id,
                    name: user.name,
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
                token.name = user.name;
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
            if (token.name) session.user.name = token.name;
            if (token.email) session.user.email = token.email;
            if (token.role) session.user.role = token.role as string;
            session.user.twoFactorEnabled = !!token.twoFactorEnabled;
            session.user.isTwoFactorAuthenticated = !!token.isTwoFactorAuthenticated;

            return session;
        },
    },
    debug: serverEnv.NODE_ENV === "development",
};

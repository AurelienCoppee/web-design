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
            isGoogleUser?: boolean;
        } & Omit<AuthUser, "id">;
    }
    interface User {
        id: string;
        role?: string | null;
        twoFactorEnabled?: boolean | null;
        _isTwoFactorAuthenticatedThisFlow?: boolean;
        isGoogleUser?: boolean;
    }
}

declare module "@auth/core/jwt" {
    interface JWT {
        id?: string;
        role?: string;
        twoFactorEnabled?: boolean;
        isTwoFactorAuthenticated?: boolean;
        isGoogleUser?: boolean;
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
            async profile(profile) {
                const dbUser = await db.user.findUnique({ where: { email: profile.email } });
                return {
                    id: profile.sub,
                    name: profile.name,
                    email: profile.email,
                    image: profile.picture,
                    role: dbUser?.role ?? 'USER',
                    twoFactorEnabled: dbUser?.twoFactorEnabled ?? false,
                    isGoogleUser: true,
                };
            },
        }),
        CredentialsProvider({
            authorize: async (credentials) => {
                const email = credentials.email as string;
                const password = credentials.password as string;
                const otp = credentials.otp as string | undefined;

                if (!email || !password) {
                    throw new Error("Email et mot de passe requis.");
                }

                const user = await db.user.findUnique({ where: { email } });
                if (!user) throw new Error("Utilisateur non trouvé.");
                if (!user.hashedPassword) throw new Error("Pas de mot de passe configuré pour ce compte. Essayez la connexion Google.");

                const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
                if (!isValidPassword) throw new Error("Mot de passe invalide.");

                let isTwoFactorAuthenticatedForThisSignIn = !user.twoFactorEnabled;

                if (user.twoFactorEnabled) {
                    if (!user.twoFactorSecret) throw new Error("Secret 2FA manquant pour l'utilisateur.");
                    if (!otp) throw new Error("Code OTP requis car la 2FA est activée.");

                    const isValidOTP = authenticator.verify({ token: otp, secret: user.twoFactorSecret });
                    if (!isValidOTP) throw new Error("Code OTP invalide.");
                    isTwoFactorAuthenticatedForThisSignIn = true;
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    role: user.role,
                    twoFactorEnabled: user.twoFactorEnabled,
                    _isTwoFactorAuthenticatedThisFlow: isTwoFactorAuthenticatedForThisSignIn,
                    isGoogleUser: false,
                };
            },
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async jwt({ token, user, account, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.name = user.name;
                token.email = user.email;
                token.picture = user.image;
                token.twoFactorEnabled = !!user.twoFactorEnabled;
                token.isGoogleUser = !!user.isGoogleUser;

                if (user.isGoogleUser) {
                    token.isTwoFactorAuthenticated = true;
                    const dbUser = await db.user.findUnique({ where: { id: user.id } });
                    if (dbUser) {
                        token.role = dbUser.role;
                        token.twoFactorEnabled = dbUser.twoFactorEnabled;
                    }
                } else {
                    token.isTwoFactorAuthenticated = !!user._isTwoFactorAuthenticatedThisFlow;
                }
            }

            if (trigger === "update" && session) {
                if (session.action === "USER_UPDATED_2FA_STATUS") {
                    const dbUser = await db.user.findUnique({ where: { id: token.id as string } });
                    if (dbUser) {
                        token.twoFactorEnabled = dbUser.twoFactorEnabled;
                        token.isTwoFactorAuthenticated = !dbUser.twoFactorEnabled;
                    }
                }
                if (session.action === "USER_ROLE_UPDATED" && session.role) {
                    token.role = session.role;
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (token.id) session.user.id = token.id as string;
            if (token.role) session.user.role = token.role as string;
            session.user.twoFactorEnabled = !!token.twoFactorEnabled;
            session.user.isTwoFactorAuthenticated = !!token.isTwoFactorAuthenticated;
            session.user.isGoogleUser = !!token.isGoogleUser;
            if (token.name) session.user.name = token.name;
            if (token.email) session.user.email = token.email;
            if (token.picture) session.user.image = token.picture;
            return session;
        },
    },
    debug: serverEnv.NODE_ENV === "development",
};

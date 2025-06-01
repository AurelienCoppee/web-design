import { APIEvent } from "@solidjs/start/server";
import { db } from "~/lib/db";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";

export async function POST(event: APIEvent) {
    try {
        const { email, password } = await event.request.json();

        if (!email || !password) {
            return new Response(
                JSON.stringify({ error: "Email et mot de passe requis." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        let user = await db.user.findUnique({ where: { email } });
        let responsePayload: Record<string, any> = {};
        let statusCode = 200;
        let message;

        if (!user) {
            const hashedPassword = await bcrypt.hash(password, 10);
            const secret = authenticator.generateSecret();
            user = await db.user.create({
                data: {
                    email,
                    hashedPassword,
                    twoFactorSecret: secret,
                    twoFactorEnabled: false,
                    role: "USER",
                },
            });
            message = "Inscription réussie.";
            responsePayload = {
                status: "SIGNUP_SUCCESS_PROMPT_2FA",
                message: message,
                email: user.email,
                otpauthUrl: authenticator.keyuri(user.email!, "Ralvo", secret)
            };
        } else {
            if (!user.hashedPassword) {
                return new Response(
                    JSON.stringify({ error: "Ce compte n'a pas de mot de passe configuré. Essayez une autre méthode de connexion." }),
                    { status: 401, headers: { "Content-Type": "application/json" } }
                );
            }
            const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
            if (!isValidPassword) {
                return new Response(
                    JSON.stringify({ error: "Identifiants invalides." }),
                    { status: 401, headers: { "Content-Type": "application/json" } }
                );
            }

            if (user.twoFactorEnabled && user.twoFactorSecret) {
                responsePayload = {
                    status: "2FA_REQUIRED",
                    email: user.email,
                    message: "Veuillez entrer votre code d'authentification à deux facteurs.",
                };
            } else {
                let secret = user.twoFactorSecret;
                if (!secret) {
                    secret = authenticator.generateSecret();
                    user = await db.user.update({
                        where: { id: user.id },
                        data: { twoFactorSecret: secret },
                    });
                }
                message = "Connexion réussie.";
                responsePayload = {
                    status: "LOGIN_SUCCESS_PROMPT_2FA",
                    message: message,
                    email: user.email,
                    otpauthUrl: authenticator.keyuri(user.email!, "Ralvo", secret)
                };
            }
        }
        return new Response(JSON.stringify(responsePayload), { status: statusCode, headers: { "Content-Type": "application/json" } });

    } catch (error: any) {
        console.error("Erreur dans /api/auth/start-auth-flow:", error);
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            return new Response(
                JSON.stringify({ error: "Cet email est déjà utilisé." }),
                { status: 409, headers: { "Content-Type": "application/json" } }
            );
        }
        return new Response(
            JSON.stringify({ error: "Erreur interne du serveur." }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

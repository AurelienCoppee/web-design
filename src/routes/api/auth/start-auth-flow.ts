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
        let needs2FASetup = false;
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
                },
            });
            needs2FASetup = true;
            message = "Inscription réussie. Veuillez configurer l'authentification à deux facteurs.";
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

            if (!user.twoFactorEnabled || !user.twoFactorSecret) {
                if (!user.twoFactorSecret) {
                    const secret = authenticator.generateSecret();
                    await db.user.update({
                        where: { id: user.id },
                        data: { twoFactorSecret: secret, twoFactorEnabled: false },
                    });
                    user.twoFactorSecret = secret;
                }
                needs2FASetup = true;
                message = "Veuillez configurer l'authentification à deux facteurs pour continuer.";
            }
        }

        if (needs2FASetup && user.twoFactorSecret) {
            const otpauthUrl = authenticator.keyuri(user.email!, "Ralvo", user.twoFactorSecret);
            return new Response(
                JSON.stringify({
                    status: "SETUP_2FA_REQUIRED",
                    otpauthUrl: otpauthUrl,
                    email: user.email,
                    message: message
                }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        } else if (user.twoFactorEnabled && user.twoFactorSecret) {
            return new Response(
                JSON.stringify({ status: "2FA_REQUIRED", email: user.email }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        } else {
            return new Response(
                JSON.stringify({ error: "Configuration utilisateur inattendue concernant la 2FA." }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

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

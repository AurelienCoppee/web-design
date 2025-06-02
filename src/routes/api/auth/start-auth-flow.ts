import { APIEvent } from "@solidjs/start/server";
import { db } from "~/lib/db";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import QRCode from "qrcode";

export async function POST(event: APIEvent) {
    try {
        let email, password;
        const contentType = event.request.headers.get("Content-Type");

        if (contentType?.includes("application/json")) {
            const jsonData = await event.request.json();
            email = jsonData.email;
            password = jsonData.password;
        } else {
            const formData = await event.request.formData();
            email = formData.get("email") as string;
            password = formData.get("password") as string;
        }


        if (!email || !password) {
            return new Response(JSON.stringify({ error: "Email et mot de passe requis." }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        const user = await db.user.findUnique({ where: { email } });

        if (!user) {
            return new Response(JSON.stringify({
                status: "NEW_USER_CONFIRM_PASSWORD",
                email: email,
                message: "Nouvel utilisateur. Veuillez confirmer votre mot de passe.",
            }), { status: 200, headers: { "Content-Type": "application/json" } });
        }

        if (!user.hashedPassword) {
            return new Response(JSON.stringify({ error: "Ce compte n'a pas de mot de passe configuré. Essayez une autre méthode de connexion." }), { status: 401, headers: { "Content-Type": "application/json" } });
        }

        const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
        if (!isValidPassword) {
            return new Response(JSON.stringify({ error: "Identifiants invalides." }), { status: 401, headers: { "Content-Type": "application/json" } });
        }

        if (user.twoFactorEnabled && user.twoFactorSecret) {
            return new Response(JSON.stringify({
                status: "2FA_REQUIRED",
                email: user.email,
                message: "Veuillez entrer votre code d'authentification à deux facteurs.",
            }), { status: 200, headers: { "Content-Type": "application/json" } });
        } else {
            let secret = user.twoFactorSecret;
            if (!secret) {
                secret = authenticator.generateSecret();
                await db.user.update({
                    where: { id: user.id },
                    data: { twoFactorSecret: secret },
                });
            }
            const otpauthUrl = authenticator.keyuri(user.email!, "Ralvo", secret);
            let qrCodeDataUrl = "";
            try {
                qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
            } catch (err) {
                console.error("Erreur génération QR code pour utilisateur existant (start-auth-flow):", err);
            }
            return new Response(JSON.stringify({
                status: "LOGIN_SUCCESS_PROMPT_2FA_SETUP",
                message: "Connexion réussie. Voulez-vous configurer l'A2F maintenant ?",
                email: user.email,
                otpauthUrl: otpauthUrl,
                qrCodeDataUrl: qrCodeDataUrl,
            }), { status: 200, headers: { "Content-Type": "application/json" } });
        }

    } catch (error: any) {
        console.error("Erreur dans /api/auth/start-auth-flow:", error);
        return new Response(JSON.stringify({ error: "Erreur interne du serveur." }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
}

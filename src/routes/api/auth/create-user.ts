import { APIEvent } from "@solidjs/start/server";
import { db } from "~/lib/db";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import QRCode from "qrcode";

export async function POST(event: APIEvent) {
    try {
        const { email, password, confirmPassword } = await event.request.json();

        if (!email || !password || !confirmPassword) {
            return new Response(JSON.stringify({ error: "Email et mots de passe requis." }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        if (password !== confirmPassword) {
            return new Response(JSON.stringify({ error: "Les mots de passe ne correspondent pas." }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        const existingUser = await db.user.findUnique({ where: { email } });
        if (existingUser) {
            return new Response(JSON.stringify({ error: "Cet email est déjà utilisé." }), { status: 409, headers: { "Content-Type": "application/json" } });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const secret = authenticator.generateSecret();

        const newUser = await db.user.create({
            data: {
                email,
                hashedPassword,
                twoFactorSecret: secret,
                twoFactorEnabled: false,
                role: "USER",
            },
        });

        const otpauthUrl = authenticator.keyuri(newUser.email!, "Ralvo", secret);
        let qrCodeDataUrl = "";
        try {
            qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
        } catch (err) {
            console.error("Erreur génération QR code pour nouvel utilisateur (create-user):", err);
        }

        return new Response(JSON.stringify({
            status: "SIGNUP_SUCCESS_PROMPT_2FA_SETUP",
            message: "Inscription réussie ! Voulez-vous configurer l'A2F maintenant ?",
            email: newUser.email,
            otpauthUrl: otpauthUrl,
            qrCodeDataUrl: qrCodeDataUrl,
        }), { status: 201, headers: { "Content-Type": "application/json" } });

    } catch (error: any) {
        console.error("Erreur dans /api/auth/create-user:", error);
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            return new Response(JSON.stringify({ error: "Cet email est déjà utilisé." }), { status: 409, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({ error: "Erreur interne du serveur." }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
}

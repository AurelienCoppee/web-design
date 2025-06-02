import { APIEvent, eventHandler } from "@solidjs/start/server";
import { getSession } from "@auth/solid-start";
import { authOptions } from "~/server/auth";
import { db } from "~/lib/db";
import { authenticator } from "otplib";
import QRCode from "qrcode";

export const POST = eventHandler(async (event: APIEvent) => {
    const session = await getSession(event.request, authOptions);

    if (!session?.user?.email) {
        return new Response(JSON.stringify({ error: "Non authentifié." }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    let user = await db.user.findUnique({ where: { email: session.user.email } });

    if (!user) {
        return new Response(JSON.stringify({ error: "Utilisateur non trouvé." }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    let secret = user.twoFactorSecret;
    if (!secret) {
        secret = authenticator.generateSecret();
        user = await db.user.update({
            where: { id: user.id },
            data: { twoFactorSecret: secret },
        });
    }

    const otpauthUrl = authenticator.keyuri(user.email!, "Ralvo", secret);
    try {
        const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
        return new Response(JSON.stringify({ otpauthUrl, qrCodeDataUrl, email: user.email }), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (err) {
        console.error("Failed to generate QR code server-side", err);
        return new Response(JSON.stringify({ error: "Erreur lors de la génération du QR code." }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
});

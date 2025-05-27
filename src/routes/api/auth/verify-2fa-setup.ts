import { APIEvent } from "@solidjs/start/server";
import { db } from "~/lib/db";
import { authenticator } from "otplib";

export async function POST(event: APIEvent) {
    const { email, otp } = await event.request.json();

    if (!email || !otp) {
        return new Response(JSON.stringify({ error: "Email et code OTP requis." }), { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email: email as string } });

    if (!user || !user.twoFactorSecret) {
        return new Response(JSON.stringify({ error: "Utilisateur non trouvé ou secret 2FA manquant." }), { status: 404 });
    }

    const isValidOTP = authenticator.verify({ token: otp as string, secret: user.twoFactorSecret });

    if (!isValidOTP) {
        return new Response(JSON.stringify({ error: "Code OTP invalide." }), { status: 400 });
    }

    await db.user.update({
        where: { id: user.id },
        data: { twoFactorEnabled: true },
    });

    return new Response(JSON.stringify({ status: "2FA_SETUP_COMPLETE" }), { status: 200 });
}

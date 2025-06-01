import { APIEvent, eventHandler } from "@solidjs/start/server";
import { getSession } from "@auth/solid-start";
import { authOptions } from "~/server/auth";
import { db } from "~/lib/db";
import { authenticator } from "otplib";

export const POST = eventHandler(async (event: APIEvent) => {
    const session = await getSession(event.request, authOptions);

    if (!session?.user?.email) {
        return new Response(JSON.stringify({ error: "Non authentifié." }), { status: 401 });
    }

    let user = await db.user.findUnique({ where: { email: session.user.email } });

    if (!user) {
        return new Response(JSON.stringify({ error: "Utilisateur non trouvé." }), { status: 404 });
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
    return new Response(JSON.stringify({ otpauthUrl, email: user.email }), { status: 200 });
});

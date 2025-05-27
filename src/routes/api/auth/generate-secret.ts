import { getSession } from "@auth/solid-start";
import { authOptions } from "~/server/auth";
import { db } from "~/lib/db";
import { authenticator } from "otplib";
import { APIEvent } from "@solidjs/start/server";

export async function POST(event: APIEvent) {
    const session = await getSession(event.request, authOptions);
    if (!session?.user?.id) {
        return new Response(JSON.stringify({ message: "Non autorisé" }), { status: 401 });
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
        return new Response(JSON.stringify({ message: "Utilisateur non trouvé" }), { status: 404 });
    }

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email!, "VotreApplication", secret);

    // Stocker temporairement le secret ou l'associer à l'utilisateur
    // avec un statut "en attente de vérification"
    await db.user.update({
        where: { id: user.id },
        data: { twoFactorSecret: secret, twoFactorEnabled: false }, // Ne pas activer avant vérification
    });

    return new Response(JSON.stringify({ secret, otpauthUrl: otpauth }), { status: 200 });
}

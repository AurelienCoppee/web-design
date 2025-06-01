import { APIEvent, eventHandler } from "@solidjs/start/server";
import { getSession, updateSession } from "@auth/solid-start";
import { authOptions } from "~/server/auth";
import { db } from "~/lib/db";

export const POST = eventHandler(async (event: APIEvent) => {
    const session = await getSession(event.request, authOptions);

    if (!session?.user?.id || !session.user.isTwoFactorAuthenticated) {
        return new Response(JSON.stringify({ error: "Authentification à deux facteurs requise ou utilisateur non connecté." }), { status: 403 });
    }

    try {
        await db.user.update({
            where: { id: session.user.id },
            data: { role: "ORGANIZER" },
        });

        return new Response(JSON.stringify({ success: true, message: "Rôle mis à jour avec succès." }), { status: 200 });
    } catch (error) {
        console.error("Erreur lors de la demande de rôle organisateur:", error);
        return new Response(JSON.stringify({ error: "Erreur interne du serveur." }), { status: 500 });
    }
});

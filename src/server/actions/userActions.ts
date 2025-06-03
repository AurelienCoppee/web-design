"use server";
import { action, json } from "@solidjs/router";
import { getSession as getServerSessionFromAuth } from "@auth/solid-start";
import { authOptions } from "~/server/auth";
import { db } from "~/lib/db";
import { getRequestEvent } from "solid-js/web";

export const requestOrganizerRoleAction = action(async (formData: FormData) => {
    const reqEvent = getRequestEvent();
    if (!reqEvent) {
        console.error("Action: Request event not found for requestOrganizerRoleAction");
        return json({ error: "Erreur de contexte serveur" }, { status: 500 });
    }
    const session = await getServerSessionFromAuth(reqEvent.request, authOptions);

    if (!session?.user?.id) {
        return json({ error: "Utilisateur non connecté." }, { status: 403 });
    }
    if (!session.user.isGoogleUser && !session.user.isTwoFactorAuthenticated) {
        return json({ error: "L'authentification à deux facteurs est requise pour devenir organisateur pour les comptes non-Google." }, { status: 403 });
    }

    try {
        await db.user.update({
            where: { id: session.user.id },
            data: { role: "ORGANIZER" },
        });
        return json({ success: true, message: "Rôle mis à jour avec succès. La modification sera effective lors de votre prochaine connexion ou rafraîchissement de session." }, { status: 200 });
    } catch (error) {
        console.error("Erreur lors de la demande de rôle organisateur:", error);
        return json({ error: "Erreur interne du serveur." }, { status: 500 });
    }
}, "requestOrganizerRoleAction");

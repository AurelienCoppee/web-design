"use server";

import { action, json } from "@solidjs/router";
import { getSession as getServerSessionFromAuth } from "@auth/solid-start";
import { authOptions } from "~/server/auth";
import { db } from "~/lib/db";
import { getRequestEvent } from "solid-js/web";
import type { Session } from "@auth/core/types";
import { getAuthSession } from "~/server/queries/sessionQueries";

export const requestOrganizerRoleAction = action(async (formData: FormData) => {
    const reqEvent = getRequestEvent();
    if (!reqEvent) {
        console.error("Action: Request event not found for requestOrganizerRoleAction");
        return json({ error: "Erreur de contexte serveur" }, { status: 500 });
    }
    const session = await getServerSessionFromAuth(reqEvent.request, authOptions) as Session | null;

    if (!session?.user?.id) {
        return json({ error: "Utilisateur non connecté." }, { status: 403 });
    }

    if (session.user.provider === "credentials" && !session.user.isTwoFactorAuthenticated) {
        return json({ error: "L'authentification à deux facteurs est requise pour cette action lorsque vous êtes connecté avec email/mot de passe." }, { status: 403 });
    }

    try {
        await db.user.update({
            where: { id: session.user.id },
            data: { role: "ORGANIZER" },
        });
        return json(
            { success: true, message: "Rôle mis à jour avec succès. La modification devrait être visible sous peu." },
            {
                status: 200,
                revalidate: getAuthSession.key
            }
        );
    } catch (error) {
        console.error("Erreur lors de la demande de rôle organisateur:", error);
        return json({ error: "Erreur interne du serveur." }, { status: 500 });
    }
}, "requestOrganizerRoleAction");

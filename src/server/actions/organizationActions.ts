import { action, json } from "@solidjs/router";
import { getSession as getServerSessionFromAuth } from "@auth/solid-start";
import { authOptions } from "~/server/auth";
import { db } from "~/lib/db";
import { z } from "zod";
import { getRequestEvent } from "solid-js/web";
import { getAuthSession } from "~/server/queries/sessionQueries";
import { getPendingOrganizationRequests } from "~/server/queries/organizationQueries";

const createOrganizationRequestSchema = z.object({
    name: z.string().min(3, "Le nom de l'organisation doit comporter au moins 3 caractères."),
    memberCount: z.coerce.number().min(1, "Le nombre de membres doit être au moins de 1."),
    pastEventsLinks: z.string().optional(),
    legalStatus: z.string().optional(),
});

export const submitOrganizationCreationRequestAction = action(async (formData: FormData) => {
    "use server";
    const reqEvent = getRequestEvent();
    if (!reqEvent) return json({ error: "Erreur de contexte serveur" }, { status: 500 });
    const session = await getServerSessionFromAuth(reqEvent.request, authOptions);

    if (!session?.user?.id) {
        return json({ error: "Utilisateur non connecté." }, { status: 403 });
    }
    if (session.user.provider === "credentials" && !session.user.isTwoFactorAuthenticated) {
        return json({ error: "L'authentification à deux facteurs est requise." }, { status: 403 });
    }

    const rawData = {
        name: formData.get("name") as string | null,
        memberCount: formData.get("memberCount") as string | null,
        pastEventsLinks: formData.get("pastEventsLinks") as string | null,
        legalStatus: formData.get("legalStatus") as string | null,
    };

    const validation = createOrganizationRequestSchema.safeParse(rawData);
    if (!validation.success) {
        return json({ error: "Données invalides.", details: validation.error.format() }, { status: 400 });
    }
    const { name, memberCount, pastEventsLinks, legalStatus } = validation.data;

    try {
        const existingRequest = await db.organizationRequest.findFirst({
            where: { userId: session.user.id, status: 'PENDING' }
        });
        if (existingRequest) {
            return json({ error: "Vous avez déjà une demande de création d'organisation en attente." }, { status: 409 });
        }

        await db.organizationRequest.create({
            data: {
                userId: session.user.id,
                name,
                memberCount,
                pastEventsLinks: pastEventsLinks || null,
                legalStatus: legalStatus || null,
                status: 'PENDING',
            },
        });
        return json({ success: true, message: "Demande de création d'organisation envoyée avec succès." }, { status: 201 });
    } catch (error) {
        console.error("Erreur lors de la soumission de la demande de création d'organisation:", error);
        return json({ error: "Erreur interne du serveur." }, { status: 500 });
    }
}, "submitOrganizationCreationRequest");


export const approveOrganizationRequestAction = action(async (formData: FormData) => {
    "use server";
    const reqEvent = getRequestEvent();
    if (!reqEvent) return json({ error: "Erreur de contexte serveur" }, { status: 500 });
    const session = await getServerSessionFromAuth(reqEvent.request, authOptions);

    if (session?.user?.role !== "ADMIN") {
        return json({ error: "Non autorisé." }, { status: 403 });
    }

    const requestId = formData.get("requestId") as string;
    if (!requestId) return json({ error: "ID de demande manquant." }, { status: 400 });

    try {
        const request = await db.organizationRequest.findUnique({ where: { id: requestId } });
        if (!request || request.status !== 'PENDING') {
            return json({ error: "Demande non trouvée ou déjà traitée." }, { status: 404 });
        }

        const organization = await db.organization.create({
            data: {
                name: request.name,
            },
        });

        await db.organizationMembership.create({
            data: {
                organizationId: organization.id,
                userId: request.userId,
                role: 'ADMIN',
            },
        });

        await db.organizationRequest.update({
            where: { id: requestId },
            data: { status: 'APPROVED' },
        });
        return json({ success: true, message: "Organisation approuvée et créée." }, { status: 200, revalidate: [getPendingOrganizationRequests.key, getAuthSession.key] });
    } catch (error) {
        console.error("Erreur lors de l'approbation de la demande:", error);
        return json({ error: "Erreur interne du serveur." }, { status: 500 });
    }
}, "approveOrganizationRequest");

export const rejectOrganizationRequestAction = action(async (formData: FormData) => {
    "use server";
    const reqEvent = getRequestEvent();
    if (!reqEvent) return json({ error: "Erreur de contexte serveur" }, { status: 500 });
    const session = await getServerSessionFromAuth(reqEvent.request, authOptions);

    if (session?.user?.role !== "ADMIN") {
        return json({ error: "Non autorisé." }, { status: 403 });
    }
    const requestId = formData.get("requestId") as string;
    if (!requestId) return json({ error: "ID de demande manquant." }, { status: 400 });

    try {
        await db.organizationRequest.update({
            where: { id: requestId },
            data: { status: 'REJECTED' },
        });
        return json({ success: true, message: "Demande rejetée." }, { status: 200, revalidate: getPendingOrganizationRequests.key });
    } catch (error) {
        console.error("Erreur lors du rejet de la demande:", error);
        return json({ error: "Erreur interne du serveur." }, { status: 500 });
    }
}, "rejectOrganizationRequest");

const addMemberSchema = z.object({
    organizationId: z.string(),
    email: z.string().email("Format d'email invalide."),
    role: z.enum(["ADMIN", "MEMBER"]),
});

export const addOrganizationMemberAction = action(async (formData: FormData) => {
    "use server";
    const reqEvent = getRequestEvent();
    if (!reqEvent) return json({ error: "Erreur de contexte serveur" }, { status: 500 });
    const session = await getServerSessionFromAuth(reqEvent.request, authOptions);

    const rawData = {
        organizationId: formData.get("organizationId") as string,
        email: formData.get("email") as string,
        role: formData.get("role") as "ADMIN" | "MEMBER" || "MEMBER"
    };
    const validation = addMemberSchema.safeParse(rawData);
    if (!validation.success) return json({ error: "Données invalides.", details: validation.error.format() }, { status: 400 });

    const { organizationId, email, role } = validation.data;

    const currentUserMembership = await db.organizationMembership.findUnique({
        where: { organizationId_userId: { organizationId, userId: session?.user?.id || "" } }
    });

    if (!currentUserMembership || currentUserMembership.role !== 'ADMIN') {
        return json({ error: "Non autorisé à ajouter des membres à cette organisation." }, { status: 403 });
    }

    try {
        const userToAdd = await db.user.findUnique({ where: { email } });
        if (!userToAdd) return json({ error: "Utilisateur à ajouter non trouvé." }, { status: 404 });

        const existingMembership = await db.organizationMembership.findUnique({
            where: { organizationId_userId: { organizationId, userId: userToAdd.id } }
        });
        if (existingMembership) return json({ error: "Cet utilisateur est déjà membre de l'organisation." }, { status: 409 });

        await db.organizationMembership.create({
            data: { organizationId, userId: userToAdd.id, role },
        });
        return json({ success: true, message: "Membre ajouté avec succès." }, { status: 201, revalidate: [getAuthSession.key] });
    } catch (error) {
        console.error("Erreur lors de l'ajout du membre:", error);
        return json({ error: "Erreur interne du serveur." }, { status: 500 });
    }
}, "addOrganizationMember");

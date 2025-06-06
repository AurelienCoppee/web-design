import { action, json } from "@solidjs/router";
import { getSession as getServerSessionFromAuth } from "@auth/solid-start";
import { authOptions } from "~/server/auth";
import { db } from "~/lib/db";
import { z } from "zod";
import { getRequestEvent } from "solid-js/web";
import { getUpcomingEvents } from "~/server/queries/eventQueries";

const createEventSchemaServer = z.object({
    title: z.string().min(3, "Le titre doit comporter au moins 3 caractères"),
    description: z.string().min(10, "La description doit comporter au moins 10 caractères"),
    date: z.string().datetime({ message: "Format de date invalide" }),
    address: z.string().min(5, "L'adresse doit comporter au moins 5 caractères"),
    city: z.string().min(2, "La ville doit comporter au moins 2 caractères"),
    region: z.string().min(2, "La région doit comporter au moins 2 caractères"),
    lat: z.coerce.number().min(-90, "Latitude invalide").max(90, "Latitude invalide"),
    lng: z.coerce.number().min(-180, "Longitude invalide").max(180, "Longitude invalide"),
    organizationId: z.string().optional(),
});

export const createEventAction = action(async (formData: FormData) => {
    "use server";
    const reqEvent = getRequestEvent();
    if (!reqEvent) {
        console.error("Action: Request event not found for createEventAction");
        return json({ error: "Erreur de contexte serveur" }, { status: 500 });
    }
    const session = await getServerSessionFromAuth(reqEvent.request, authOptions);

    if (!session?.user?.id) {
        return json({ error: "Non autorisé." }, { status: 403 });
    }

    const organizationId = formData.get("organizationId") as string | undefined;

    let canCreate = false;
    try {
        if (organizationId) {
            const membership = await db.organizationMembership.findUnique({
                where: { organizationId_userId: { organizationId, userId: session.user.id } }
            });
            if (membership?.role === 'ADMIN') {
                canCreate = true;
            }
        } else {
            if (session.user.role === "ADMIN") {
                canCreate = true;
            }
        }

        if (!canCreate) {
            return json({ error: "Non autorisé à créer un événement pour cette organisation ou en tant qu'utilisateur personnel." }, { status: 403 });
        }

        const rawData = {
            title: formData.get("title") as string | null,
            description: formData.get("description") as string | null,
            date: formData.get("date") as string | null,
            time: formData.get("time") as string | null,
            address: formData.get("address") as string | null,
            city: formData.get("city") as string | null,
            region: formData.get("region") as string | null,
            lat: formData.get("lat") as string | null,
            lng: formData.get("lng") as string | null,
            organizationId: organizationId || null,
        };

        if (!rawData.date || !rawData.time) {
            return json({ error: "Les champs date et heure du formulaire sont requis." }, { status: 400 });
        }

        const eventDate = new Date(`${rawData.date}T${rawData.time}`);

        const eventDataToValidate = {
            title: rawData.title,
            description: rawData.description,
            date: eventDate.toISOString(),
            address: rawData.address,
            city: rawData.city,
            region: rawData.region,
            lat: rawData.lat,
            lng: rawData.lng,
            organizationId: rawData.organizationId,
        };

        const validation = createEventSchemaServer.safeParse(eventDataToValidate);

        if (!validation.success) {
            console.error("Zod validation failed:", validation.error.format());
            return json({ error: "Données d'événement invalides", details: validation.error.format() }, { status: 400 });
        }
        const validatedData = validation.data;

        const newEvent = await db.event.create({
            data: {
                title: validatedData.title,
                description: validatedData.description,
                date: new Date(validatedData.date),
                address: validatedData.address,
                city: validatedData.city,
                region: validatedData.region,
                lat: validatedData.lat,
                lng: validatedData.lng,
                organizerId: session.user.id,
                organizationId: validatedData.organizationId || undefined,
            },
        });
        return json(newEvent, { status: 201, revalidate: getUpcomingEvents.key });

    } catch (error) {
        console.error("Erreur lors de la création de l'événement:", error);
        return json({ error: "Une erreur interne est survenue lors de la création de l'événement." }, { status: 500 });
    }
}, "createEventAction");

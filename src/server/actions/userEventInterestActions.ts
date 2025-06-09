import { action, json } from "@solidjs/router";
import { getSession as getServerSessionFromAuth } from "@auth/solid-start";
import { authOptions } from "~/server/auth";
import { db } from "~/lib/db";
import { z } from "zod";
import { getRequestEvent } from "solid-js/web";
import { getMyEventInterests, getEventInterestCountForUser } from "~/server/queries/userEventInterestQueries";

const eventInterestSchema = z.object({
    eventId: z.string().min(1, "Event ID is required."),
});

export const markEventInterestAction = action(async (formData: FormData) => {
    "use server";
    const reqEvent = getRequestEvent();
    if (!reqEvent) return json({ error: "Server context error" }, { status: 500 });
    const session = await getServerSessionFromAuth(reqEvent.request, authOptions);

    if (!session?.user?.id) {
        return json({ error: "Unauthorized." }, { status: 403 });
    }

    const validation = eventInterestSchema.safeParse({ eventId: formData.get("eventId") });
    if (!validation.success) {
        return json({ error: "Invalid input.", details: validation.error.format() }, { status: 400 });
    }
    const { eventId } = validation.data;

    try {
        const event = await db.event.findUnique({ where: { id: eventId } });
        if (!event) {
            return json({ error: "Event not found." }, { status: 404 });
        }

        await db.userEventInterest.upsert({
            where: {
                userId_eventId: {
                    userId: session.user.id,
                    eventId: eventId,
                }
            },
            update: {},
            create: {
                userId: session.user.id,
                eventId: eventId,
                eventDate: new Date(event.date.getFullYear(), event.date.getMonth(), event.date.getDate()),
            },
        });

        return json({ success: true, message: "Interest marked." }, { status: 200, revalidate: [getMyEventInterests.key, getEventInterestCountForUser.keyFor(eventId)] });
    } catch (error) {
        console.error("Error marking event interest:", error);
        return json({ error: "Failed to mark interest." }, { status: 500 });
    }
}, "markEventInterest");

export const removeEventInterestAction = action(async (formData: FormData) => {
    "use server";
    const reqEvent = getRequestEvent();
    if (!reqEvent) return json({ error: "Server context error" }, { status: 500 });
    const session = await getServerSessionFromAuth(reqEvent.request, authOptions);

    if (!session?.user?.id) {
        return json({ error: "Unauthorized." }, { status: 403 });
    }

    const validation = eventInterestSchema.safeParse({ eventId: formData.get("eventId") });
    if (!validation.success) {
        return json({ error: "Invalid input.", details: validation.error.format() }, { status: 400 });
    }
    const { eventId } = validation.data;

    try {
        await db.userEventInterest.deleteMany({
            where: {
                userId: session.user.id,
                eventId: eventId,
            },
        });
        return json({ success: true, message: "Interest removed." }, { status: 200, revalidate: [getMyEventInterests.key, getEventInterestCountForUser.keyFor(eventId)] });
    } catch (error) {
        console.error("Error removing event interest:", error);
        return json({ error: "Failed to remove interest." }, { status: 500 });
    }
}, "removeEventInterest");

import { APIEvent } from "@solidjs/start/server";
import { getSession } from "@auth/solid-start";
import { authOptions } from "~/server/auth";
import { db } from "~/lib/db";
import { z } from "zod";

const createEventSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    date: z.string().datetime("Invalid date format"),
    address: z.string().min(5, "Address must be at least 5 characters"),
    city: z.string().min(2, "City must be at least 2 characters"),
    region: z.string().min(2, "Region must be at least 2 characters"),
    lat: z.number().min(-90).max(90, "Invalid latitude"),
    lng: z.number().min(-180).max(180, "Invalid longitude"),
});

export async function POST(event: APIEvent) {
    const session = await getSession(event.request, authOptions);

    if (!session?.user?.id || (session.user.role !== "ORGANIZER" && session.user.role !== "ADMIN")) {
        return new Response(
            JSON.stringify({ error: "Unauthorized. Organizer or Admin role required." }),
            { status: 403, headers: { "Content-Type": "application/json" } }
        );
    }

    try {
        let body;
        const contentType = event.request.headers.get("Content-Type");

        if (contentType?.includes("application/json")) {
            const jsonData = await event.request.json();
            body = jsonData.body;
        } else if (contentType?.includes("application/x-www-form-urlencoded")) {
            const formData = await event.request.formData();
            body = formData.get("body") as string;
        } else {
            return new Response(JSON.stringify({ error: "Unsupported Content-Type" }), { status: 415 });
        }

        const validation = createEventSchema.safeParse(body);

        if (!validation.success) {
            return new Response(
                JSON.stringify({ error: "Invalid event data", details: validation.error.format() }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const eventData = validation.data;

        const newEvent = await db.event.create({
            data: {
                ...eventData,
                date: new Date(eventData.date),
                organizerId: session.user.id,
            },
        });

        return new Response(JSON.stringify(newEvent), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error creating event:", error);
        if (error instanceof z.ZodError) {
            return new Response(
                JSON.stringify({ error: "Invalid event data", details: error.format() }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }
        return new Response(
            JSON.stringify({ error: "Failed to create event" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
};

import { APIEvent } from "@solidjs/start/server";
import { db } from "~/lib/db";

export async function GET(event: APIEvent) {
    try {
        const events = await db.event.findMany({
            where: {
                date: {
                    gte: new Date(),
                },
            },
            orderBy: {
                date: "asc",
            },
            include: {
                organizer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                }
            }
        });
        return new Response(JSON.stringify(events), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "public, max-age=300"
            },
        });
    } catch (error) {
        console.error("Error fetching events:", error);
        return new Response(JSON.stringify({ error: "Failed to fetch events" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};

import { query } from "@solidjs/router";
import { db } from "~/lib/db";
import type { Event as EventTypePrisma, User as UserTypePrisma } from "@prisma/client";

export type EventWithOrganizer = EventTypePrisma & { organizer?: Pick<UserTypePrisma, 'id' | 'name' | 'email'> };

export const getUpcomingEvents = query(async (): Promise<EventWithOrganizer[]> => {
    "use server";
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
        return events as EventWithOrganizer[];
    } catch (error) {
        console.error("Error fetching upcoming events:", error);
        throw new Error("Failed to fetch upcoming events");
    }
}, "upcomingEvents");

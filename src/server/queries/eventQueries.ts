import { query } from "@solidjs/router";
import { db } from "~/lib/db";
import type { Event as EventTypePrisma, User as UserTypePrisma, Organization } from "@prisma/client";

export type EventWithDetails = EventTypePrisma & {
    organizer?: Pick<UserTypePrisma, 'id' | 'name' | 'email'>;
    organization?: Pick<Organization, 'id' | 'name'>;
};

export const getUpcomingEvents = query(async (): Promise<EventWithDetails[]> => {
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
                organization: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            }
        });
        return events as EventWithDetails[];
    } catch (error) {
        console.error("Error fetching upcoming events:", error);
        throw new Error("Failed to fetch upcoming events");
    }
}, "upcomingEvents");

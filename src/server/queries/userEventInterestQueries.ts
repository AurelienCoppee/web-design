import { query } from "@solidjs/router";
import { db } from "~/lib/db";
import type { User, Event, UserEventInterest } from "@prisma/client";

export type UserInterestWithEvent = UserEventInterest & {
    event: Pick<Event, 'id' | 'title' | 'date'>
};

export type InterestedUserForEvent = Pick<User, 'id' | 'name' | 'email'>;

export const getMyEventInterests = query(async (userId: string): Promise<UserInterestWithEvent[]> => {
    "use server";
    if (!userId) return [];
    try {
        const interests = await db.userEventInterest.findMany({
            where: { userId },
            include: { event: { select: { id: true, title: true, date: true } } },
            orderBy: { event: { date: 'asc' } }
        });
        return interests;
    } catch (error) {
        console.error("Error fetching user event interests:", error);
        throw new Error("Failed to fetch user event interests");
    }
}, "myEventInterests");

export const getInterestedOrgMembersForEvent = query(
    async (eventId: string, organizationId: string): Promise<InterestedUserForEvent[]> => {
        "use server";
        try {
            const interests = await db.userEventInterest.findMany({
                where: {
                    eventId: eventId,
                    user: {
                        organizationMemberships: {
                            some: { organizationId: organizationId }
                        }
                    }
                },
                include: {
                    user: { select: { id: true, name: true, email: true } }
                }
            });
            return interests.map(interest => interest.user);
        } catch (error) {
            console.error("Error fetching interested org members for event:", error);
            throw new Error("Failed to fetch interested org members");
        }
    }, "interestedOrgMembersForEvent");

export const getEventInterestCountForUser = query(async (eventId: string): Promise<number> => {
    "use server";
    try {
        const count = await db.userEventInterest.count({
            where: { eventId: eventId }
        });
        return count;
    } catch (error) {
        console.error("Error fetching event interest count:", error);
        throw new Error("Failed to fetch event interest count");
    }
}, "eventInterestCountForUser");


export const getUserInterestsForDay = query(
    async (userId: string, date: string): Promise<UserEventInterest | null> => {
        "use server";
        if (!userId || !date) return null;
        try {
            const targetDate = new Date(date);
            const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
            const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

            return await db.userEventInterest.findFirst({
                where: {
                    userId: userId,
                    eventDate: {
                        gte: startDate,
                        lt: endDate,
                    }
                }
            });
        } catch (error) {
            console.error("Error fetching user interests for day:", error);
            return null;
        }
    }, "userInterestsForDay");

export const getInterestedCoMembersForEvent = query(
    async (eventId: string, currentUserId: string): Promise<InterestedUserForEvent[]> => {
        "use server";
        if (!eventId || !currentUserId) return [];

        try {
            const userOrgs = await db.organizationMembership.findMany({
                where: { userId: currentUserId },
                select: { organizationId: true }
            });

            if (userOrgs.length === 0) {
                return [];
            }
            const orgIds = userOrgs.map(org => org.organizationId);

            const coMembersInterests = await db.userEventInterest.findMany({
                where: {
                    eventId: eventId,
                    userId: {
                        not: currentUserId
                    },
                    user: {
                        organizationMemberships: {
                            some: {
                                organizationId: {
                                    in: orgIds
                                }
                            }
                        }
                    }
                },
                include: {
                    user: {
                        select: { id: true, name: true, email: true }
                    }
                }
            });

            return coMembersInterests.map(interest => interest.user);

        } catch (error) {
            console.error("Error fetching interested co-members for event:", error);
            throw new Error("Failed to fetch interested co-members");
        }
    }, "interestedCoMembersForEvent"
);

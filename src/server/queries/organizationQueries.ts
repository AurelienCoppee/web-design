import { query } from "@solidjs/router";
import { db } from "~/lib/db";
import type { OrganizationRequests, OrganizationMemberships, User, Organizations } from "@prisma/client";

export type OrganizationRequestWithUser = OrganizationRequests & { user: Pick<User, 'id' | 'name' | 'email'> };
export type OrganizationMembershipWithUser = OrganizationMemberships & { user: Pick<User, 'id' | 'name' | 'email'> };
export type OrganizationWithMembers = Organizations & { members: OrganizationMembershipWithUser[] };

export const getPendingOrganizationRequests = query(async (): Promise<OrganizationRequestWithUser[]> => {
    "use server";
    try {
        const requests = await db.organizationRequests.findMany({
            where: { status: 'PENDING' },
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'asc' },
        });
        return requests as OrganizationRequestWithUser[];
    } catch (error) {
        console.error("Error fetching pending organization requests:", error);
        throw new Error("Failed to fetch pending organization requests");
    }
}, "pendingOrganizationRequests");

export const getOrganizationMembers = query(async (organizationId: string): Promise<OrganizationMembershipWithUser[]> => {
    "use server";
    try {
        const memberships = await db.organizationMemberships.findMany({
            where: { organizationId },
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { user: { name: 'asc' } }
        });
        return memberships as OrganizationMembershipWithUser[];
    } catch (error) {
        console.error("Error fetching organization members:", error);
        throw new Error("Failed to fetch organization members");
    }
}, "organizationMembers");

export const getUserAdminOrganizations = query(async (userId: string): Promise<Organizations[]> => {
    "use server";
    try {
        const memberships = await db.organizationMemberships.findMany({
            where: { userId, role: 'ADMIN' },
            include: { organization: true }
        });
        return memberships.map(m => m.organization);
    } catch (error) {
        console.error("Error fetching user's admin organizations:", error);
        throw new Error("Failed to fetch user's admin organizations");
    }
}, "userAdminOrganizations");

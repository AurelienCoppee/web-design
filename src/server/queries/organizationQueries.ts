import { query } from "@solidjs/router";
import { db } from "~/lib/db";
import type { OrganizationRequest, OrganizationMembership, User, Organization } from "@prisma/client";

export type OrganizationRequestWithUser = OrganizationRequest & { user: Pick<User, 'id' | 'name' | 'email'> };
export type OrganizationMembershipWithUser = OrganizationMembership & { user: Pick<User, 'id' | 'name' | 'email'> };
export type OrganizationWithMembers = Organization & { members: OrganizationMembershipWithUser[] };

export const getPendingOrganizationRequests = query(async (): Promise<OrganizationRequestWithUser[]> => {
    "use server";
    try {
        const requests = await db.organizationRequest.findMany({
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
        const memberships = await db.organizationMembership.findMany({
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

export const getUserAdminOrganizations = query(async (userId: string): Promise<Organization[]> => {
    "use server";
    try {
        const memberships = await db.organizationMembership.findMany({
            where: { userId, role: 'ADMIN' },
            include: { organization: true }
        });
        return memberships.map(m => m.organization);
    } catch (error) {
        console.error("Error fetching user's admin organizations:", error);
        throw new Error("Failed to fetch user's admin organizations");
    }
}, "userAdminOrganizations");

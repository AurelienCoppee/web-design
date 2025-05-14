import { useSession } from "vinxi/http";
import { prisma } from "./db.js";
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";

import type { User, Session } from "@prisma/client";
import { db } from "./db";

export function validateUsername(username: unknown) {
    if (typeof username !== "string" || username.length < 3) {
        return `Usernames must be at least 3 characters long`;
    }
}

export function validatePassword(password: unknown) {
    if (typeof password !== "string" || password.length < 6) {
        return `Passwords must be at least 6 characters long`;
    }
}

export async function login(username: string, password: string) {
    const user = await db.user.findUnique({ where: { username } });
    if (!user || password !== user.password) throw new Error("Invalid login");
    return user;
}

export async function logout() {
    const session = await getSession();
    await session.update(d => {
        d.userId = undefined;
    });
}

export async function register(username: string, password: string) {
    const existingUser = await db.user.findUnique({ where: { username } });
    if (existingUser) throw new Error("User already exists");
    return db.user.create({
        data: { username: username, password }
    });
}

export function getSession() {
    return useSession({
        password: process.env.SESSION_SECRET!
    });
}

export function generateSessionToken(): string {
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);
    const token = encodeBase32LowerCaseNoPadding(bytes);
    return token;
}

export async function createSession(token: string, userId: number): Promise<Session> {
    const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
    const session: Session = {
        id: sessionId,
        userId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
    };
    await prisma.session.create({
        data: session
    });
    return session;
}

export async function validateSessionToken(token: string): Promise<SessionValidationResult> {
    const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
    const result = await prisma.session.findUnique({
        where: {
            id: sessionId
        },
        include: {
            user: true
        }
    });
    if (result === null) {
        return { session: null, user: null };
    }
    const { user, ...session } = result;
    if (Date.now() >= session.expiresAt.getTime()) {
        await prisma.session.delete({ where: { id: sessionId } });
        return { session: null, user: null };
    }
    if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
        session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
        await prisma.session.update({
            where: {
                id: session.id
            },
            data: {
                expiresAt: session.expiresAt
            }
        });
    }
    return { session, user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
    await prisma.session.delete({ where: { id: sessionId } });
}

export async function invalidateAllSessions(userId: number): Promise<void> {
    await prisma.session.deleteMany({
        where: {
            userId: userId
        }
    });
}

export type SessionValidationResult =
    | { session: Session; user: User }
    | { session: null; user: null };

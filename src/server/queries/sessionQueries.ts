"use server";

import { query } from "@solidjs/router";
import { getSession as getServerSession } from "@auth/solid-start";
import { authOptions } from "~/server/auth";
import { getRequestEvent } from "solid-js/web";

export const getAuthSession = query(async () => {
    const event = getRequestEvent();
    if (!event) {
        console.error("[Query:getAuthSession] No request event found on server.");
        return null;
    }
    try {
        return await getServerSession(event.request, authOptions);
    } catch (e) {
        console.error("[Query:getAuthSession] Error fetching session:", e);
        return null;
    }
}, "authSessionQuery");

import { type SolidAuthConfig } from "@auth/solid-start";
import GitHub from "@auth/solid-start/providers/github";
import Nodemailer from "@auth/solid-start/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { serverEnv } from "~/env/server";
import db from "~/lib/db"

declare module "@auth/core/types" {
    export interface Session {
        user?: DefaultSession["user"];
    }
}

export const authOptions: SolidAuthConfig = {
    adapter: PrismaAdapter(db),
    providers: [
        GitHub({
            clientId: serverEnv.GITHUB_ID!,
            clientSecret: serverEnv.GITHUB_SECRET!,
        }),
        Nodemailer({
            id: "nodemailer",
            server: {
                host: serverEnv.EMAIL_SERVER_HOST!,
                port: Number(serverEnv.EMAIL_SERVER_PORT!),
                auth: {
                    user: serverEnv.EMAIL_SERVER_USER!,
                    pass: serverEnv.EMAIL_SERVER_PASSWORD!,
                },
            },
            from: serverEnv.EMAIL_FROM!,
        }),
    ],
    debug: false,
    basePath: import.meta.env.VITE_AUTH_PATH,
};

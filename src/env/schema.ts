import { z } from "zod"

export const serverScheme = z.object({
    NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    AUTH_SECRET: z.string(),
})

export const clientScheme = z.object({
    MODE: z.enum(["development", "production", "test"]).default("development"),
})

// src/env/server.ts
import { serverScheme } from "./schema";
import type { ZodFormattedError } from "zod";

export const formatErrors = (
    errors: ZodFormattedError<Map<string, string>, string>
) =>
    Object.entries(errors)
        .map(([name, value]) => {
            if (value && "_errors" in value)
                return `${name}: ${value._errors.join(", ")}\n`
        })
        .filter(Boolean)

console.log("--- Début de la validation des variables d'environnement serveur (process.env direct) ---");
console.log(`[ENV CHECK] GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID}`);
console.log(`[ENV CHECK] GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET}`);
console.log(`[ENV CHECK] AUTH_SECRET: ${process.env.AUTH_SECRET}`);
console.log(`[ENV CHECK] NODE_ENV: ${process.env.NODE_ENV}`);
console.log("--- Tentative de validation Zod sur process.env ---");

const envResult = serverScheme.safeParse(process.env);

if (envResult.success === false) {
    console.error(
        "❌ Échec de la validation Zod sur process.env. Erreur détaillée:",
        JSON.stringify(envResult.error.format(), null, 2)
    );
    throw new Error("Variables d'environnement invalides - Échec de la validation Zod sur process.env");
}

console.log("✅ Validation Zod sur process.env réussie!");
export const serverEnv = envResult.data;

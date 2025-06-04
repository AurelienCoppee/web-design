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

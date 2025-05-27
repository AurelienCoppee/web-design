import { db } from "~/lib/db";
import bcrypt from "bcryptjs";
import { APIEvent } from "@solidjs/start/server";

export async function POST(event: APIEvent) {
    const { email, password, name } = await event.request.json();

    if (!email || !password) {
        return new Response(JSON.stringify({ message: "Email et mot de passe requis" }), { status: 400 });
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
        return new Response(JSON.stringify({ message: "L'utilisateur existe déjà" }), { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const user = await db.user.create({
            data: {
                email,
                name,
                hashedPassword,
            },
        });
        return new Response(JSON.stringify({ message: "Utilisateur créé", userId: user.id }), { status: 201 });
    } catch (error) {
        return new Response(JSON.stringify({ message: "Erreur lors de la création de l'utilisateur" }), { status: 500 });
    }
}

import { action, json } from "@solidjs/router";
import { db } from "~/lib/db";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { getSession as getServerSessionFromAuth } from "@auth/solid-start";
import { authOptions } from "~/server/auth";
import { getRequestEvent } from "solid-js/web";
import { z } from "zod";
import { getAuthSession } from "~/server/queries/sessionQueries";

const emailPasswordSchema = z.object({
    email: z.string().email("Format d'email invalide."),
    password: z.string().min(1, "Le mot de passe est requis."),
});

const createUserSchema = z.object({
    email: z.string().email("Format d'email invalide."),
    originalPassword: z.string().min(1, "Le mot de passe original est requis."),
    confirmPassword: z.string().min(1, "La confirmation du mot de passe est requise."),
    emailVerificationCode: z.string().optional(),
}).refine(data => data.originalPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
});

const verify2FASchema = z.object({
    email: z.string().email("Format d'email invalide."),
    otp: z.string().length(6, "Le code OTP doit comporter 6 chiffres."),
});


export const startAuthFlowAction = action(async (input: z.infer<typeof emailPasswordSchema>) => {
    "use server";
    const validation = emailPasswordSchema.safeParse(input);
    if (!validation.success) {
        return json({ error: "Données invalides.", details: validation.error.format() }, { status: 400, revalidate: "nothing" });
    }
    const { email, password } = validation.data;

    try {
        const user = await db.user.findUnique({ where: { email } });

        if (!user) {
            return json(
                {
                    status: "NEW_USER_CONFIRM_PASSWORD",
                    email: email,
                    message: "Nouveau compte. Veuillez confirmer vos informations.",
                },
                { revalidate: "nothing" }
            );
        }

        if (!user.hashedPassword) {
            return json({ error: "Ce compte n'a pas de mot de passe configuré. Essayez une autre méthode de connexion." }, { status: 401, revalidate: "nothing" });
        }

        const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
        if (!isValidPassword) {
            return json({ error: "Identifiants invalides." }, { status: 401, revalidate: "nothing" });
        }

        if (user.twoFactorEnabled && user.twoFactorSecret) {
            return json(
                {
                    status: "2FA_REQUIRED",
                    email: user.email,
                    message: "Veuillez entrer votre code d'authentification à deux facteurs.",
                },
                { revalidate: "nothing" }
            );
        } else {
            return json(
                {
                    status: "LOGIN_SUCCESS_PROMPT_2FA_SETUP",
                    message: "Connexion réussie. Voulez-vous configurer l'A2F maintenant ?",
                    email: user.email,
                },
                { revalidate: "nothing" }
            );
        }
    } catch (error: any) {
        console.error("Erreur dans startAuthFlowAction:", error);
        return json({ error: "Erreur interne du serveur." }, { status: 500, revalidate: "nothing" });
    }
}, "startAuthFlowAction");


export const createUserAction = action(async (input: z.infer<typeof createUserSchema>) => {
    "use server";
    const validation = createUserSchema.safeParse(input);
    if (!validation.success) {
        return json({ error: "Données d'inscription invalides.", details: validation.error.format() }, { status: 400, revalidate: "nothing" });
    }
    const { email, originalPassword, emailVerificationCode } = validation.data;

    try {
        const existingUser = await db.user.findUnique({ where: { email } });
        if (existingUser) {
            return json({ error: "Cet email est déjà utilisé." }, { status: 409, revalidate: "nothing" });
        }

        const hashedPassword = await bcrypt.hash(originalPassword, 10);
        const newUser = await db.user.create({
            data: {
                email,
                hashedPassword,
                twoFactorEnabled: false,
                role: "USER",
            },
        });

        return json(
            {
                status: "SIGNUP_SUCCESS_PROMPT_2FA_SETUP",
                message: "Inscription réussie ! Voulez-vous configurer l'A2F maintenant ?",
                email: newUser.email,
            },
            { status: 201, revalidate: "nothing" }
        );

    } catch (error: any) {
        console.error("Erreur dans createUserAction:", error);
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            return json({ error: "Cet email est déjà utilisé." }, { status: 409, revalidate: "nothing" });
        }
        return json({ error: "Erreur interne du serveur." }, { status: 500, revalidate: "nothing" });
    }
}, "createUserAction");


export const request2FASetupDetailsAction = action(async (formData?: FormData) => {
    "use server";
    const reqEvent = getRequestEvent();
    if (!reqEvent) return json({ error: "Contexte serveur manquant" }, { status: 500, revalidate: "nothing" });

    let userEmail: string | undefined | null;
    const currentSolidAuthSession = await getAuthSession();

    if (currentSolidAuthSession?.user?.email) {
        userEmail = currentSolidAuthSession.user.email;
    } else {
        const authJsSession = await getServerSessionFromAuth(reqEvent.request, authOptions);
        userEmail = authJsSession?.user?.email;
    }

    const emailFromForm = formData?.get("email") as string | undefined;
    if (emailFromForm && !userEmail) {
        userEmail = emailFromForm;
    }

    if (!userEmail) {
        return json({ error: "Email utilisateur non disponible pour la configuration 2FA." }, { status: 400, revalidate: "nothing" });
    }

    let user = await db.user.findUnique({ where: { email: userEmail } });
    if (!user) {
        return json({ error: "Utilisateur non trouvé." }, { status: 404, revalidate: "nothing" });
    }

    let secret = user.twoFactorSecret;
    if (!secret) {
        secret = authenticator.generateSecret();
        user = await db.user.update({
            where: { id: user.id },
            data: { twoFactorSecret: secret },
        });
    }

    const otpauthUrl = authenticator.keyuri(user.email!, "Ralvo", secret);
    try {
        const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
        return json({ otpauthUrl, qrCodeDataUrl, email: user.email! }, { revalidate: "nothing" });
    } catch (err) {
        console.error("Erreur génération QR code (request2FASetupDetailsAction):", err);
        return json({ error: "Erreur lors de la génération du QR code.", otpauthUrl, email: user.email! }, { status: 500, revalidate: "nothing" });
    }
}, "request2FASetupDetailsAction");


export const verifyAndEnable2FAAction = action(async (input: z.infer<typeof verify2FASchema>) => {
    "use server";
    const validation = verify2FASchema.safeParse(input);
    if (!validation.success) {
        return json({ error: "Données invalides.", details: validation.error.format() }, { status: 400, revalidate: "nothing" });
    }
    const { email, otp } = validation.data;

    const user = await db.user.findUnique({ where: { email } });

    if (!user || !user.twoFactorSecret) {
        return json({ error: "Utilisateur non trouvé ou secret 2FA manquant." }, { status: 404, revalidate: "nothing" });
    }

    const isValidOTP = authenticator.verify({ token: otp, secret: user.twoFactorSecret });

    if (!isValidOTP) {
        return json({ error: "Code OTP invalide." }, { status: 400, revalidate: "nothing" });
    }

    await db.user.update({
        where: { id: user.id },
        data: { twoFactorEnabled: true },
    });

    return json(
        { status: "2FA_SETUP_COMPLETE", message: "Authentification à deux facteurs activée avec succès ! Veuillez vous connecter pour l'utiliser." },
        { revalidate: [getAuthSession.key] }
    );
}, "verifyAndEnable2FAAction");

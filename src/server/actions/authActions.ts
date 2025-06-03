"use server";
import { action, json } from "@solidjs/router";
import { db } from "~/lib/db";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { getSession as getServerSessionFromAuth } from "@auth/solid-start";
import { authOptions } from "~/server/auth";
import { getRequestEvent } from "solid-js/web";
import { z } from "zod";

const emailPasswordSchema = z.object({
    email: z.string().email("Format d'email invalide."),
    password: z.string().min(1, "Le mot de passe est requis."),
});

const createUserSchema = emailPasswordSchema.extend({
    confirmPassword: z.string().min(1, "La confirmation du mot de passe est requise."),
}).refine(data => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
});

const verify2FASchema = z.object({
    email: z.string().email("Format d'email invalide."),
    otp: z.string().length(6, "Le code OTP doit comporter 6 chiffres."),
});


export const startAuthFlowAction = action(async (input: z.infer<typeof emailPasswordSchema>) => {
    const validation = emailPasswordSchema.safeParse(input);
    if (!validation.success) {
        return json({ error: "Données invalides.", details: validation.error.format() }, { status: 400 });
    }
    const { email, password } = validation.data;

    try {
        const user = await db.user.findUnique({ where: { email } });

        if (!user) {
            return json({
                status: "NEW_USER_CONFIRM_PASSWORD",
                email: email,
                message: "Nouvel utilisateur. Veuillez confirmer votre mot de passe.",
            });
        }

        if (!user.hashedPassword) {
            return json({ error: "Ce compte n'a pas de mot de passe configuré. Essayez une autre méthode de connexion." }, { status: 401 });
        }

        const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
        if (!isValidPassword) {
            return json({ error: "Identifiants invalides." }, { status: 401 });
        }

        if (user.twoFactorEnabled && user.twoFactorSecret) {
            return json({
                status: "2FA_REQUIRED",
                email: user.email,
                message: "Veuillez entrer votre code d'authentification à deux facteurs.",
            });
        } else {
            let secret = user.twoFactorSecret;
            if (!secret) {
                secret = authenticator.generateSecret();
                await db.user.update({
                    where: { id: user.id },
                    data: { twoFactorSecret: secret },
                });
            }
            const otpauthUrl = authenticator.keyuri(user.email!, "Ralvo", secret);
            let qrCodeDataUrl = "";
            try {
                qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
            } catch (err) {
                console.error("Erreur génération QR code (startAuthFlowAction):", err);
            }
            return json({
                status: "LOGIN_SUCCESS_PROMPT_2FA_SETUP",
                message: "Connexion réussie. Voulez-vous configurer l'A2F maintenant ?",
                email: user.email,
                otpauthUrl: otpauthUrl,
                qrCodeDataUrl: qrCodeDataUrl,
            });
        }
    } catch (error: any) {
        console.error("Erreur dans startAuthFlowAction:", error);
        return json({ error: "Erreur interne du serveur." }, { status: 500 });
    }
}, "startAuthFlowAction");


export const createUserAction = action(async (input: z.infer<typeof createUserSchema>) => {
    const validation = createUserSchema.safeParse(input);
    if (!validation.success) {
        return json({ error: "Données invalides.", details: validation.error.format() }, { status: 400 });
    }
    const { email, password } = validation.data;

    try {
        const existingUser = await db.user.findUnique({ where: { email } });
        if (existingUser) {
            return json({ error: "Cet email est déjà utilisé." }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const secret = authenticator.generateSecret();

        const newUser = await db.user.create({
            data: {
                email,
                hashedPassword,
                twoFactorSecret: secret,
                twoFactorEnabled: false,
                role: "USER",
            },
        });

        const otpauthUrl = authenticator.keyuri(newUser.email!, "Ralvo", secret);
        let qrCodeDataUrl = "";
        try {
            qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
        } catch (err) {
            console.error("Erreur génération QR code (createUserAction):", err);
        }

        return json({
            status: "SIGNUP_SUCCESS_PROMPT_2FA_SETUP",
            message: "Inscription réussie ! Voulez-vous configurer l'A2F maintenant ?",
            email: newUser.email,
            otpauthUrl: otpauthUrl,
            qrCodeDataUrl: qrCodeDataUrl,
        }, { status: 201 });

    } catch (error: any) {
        console.error("Erreur dans createUserAction:", error);
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            return json({ error: "Cet email est déjà utilisé." }, { status: 409 });
        }
        return json({ error: "Erreur interne du serveur." }, { status: 500 });
    }
}, "createUserAction");


export const request2FASetupDetailsAction = action(async () => {
    const reqEvent = getRequestEvent();
    if (!reqEvent) return json({ error: "Contexte serveur manquant" }, { status: 500 });
    const session = await getServerSessionFromAuth(reqEvent.request, authOptions);

    if (!session?.user?.email) {
        return json({ error: "Non authentifié." }, { status: 401 });
    }

    let user = await db.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
        return json({ error: "Utilisateur non trouvé." }, { status: 404 });
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
        return json({ otpauthUrl, qrCodeDataUrl, email: user.email });
    } catch (err) {
        console.error("Erreur génération QR code (request2FASetupDetailsAction):", err);
        return json({ error: "Erreur lors de la génération du QR code.", otpauthUrl, email: user.email }, { status: 500 });
    }
}, "request2FASetupDetailsAction");


export const verifyAndEnable2FAAction = action(async (input: z.infer<typeof verify2FASchema>) => {
    const validation = verify2FASchema.safeParse(input);
    if (!validation.success) {
        return json({ error: "Données invalides.", details: validation.error.format() }, { status: 400 });
    }
    const { email, otp } = validation.data;

    const user = await db.user.findUnique({ where: { email } });

    if (!user || !user.twoFactorSecret) {
        return json({ error: "Utilisateur non trouvé ou secret 2FA manquant." }, { status: 404 });
    }

    const isValidOTP = authenticator.verify({ token: otp, secret: user.twoFactorSecret });

    if (!isValidOTP) {
        return json({ error: "Code OTP invalide." }, { status: 400 });
    }

    await db.user.update({
        where: { id: user.id },
        data: { twoFactorEnabled: true },
    });

    return json(
        { status: "2FA_SETUP_COMPLETE", message: "Authentification à deux facteurs activée avec succès !" },
        { revalidate: ["authSessionFormQuery", "authSessionHeader"] }
    );
}, "verifyAndEnable2FAAction");

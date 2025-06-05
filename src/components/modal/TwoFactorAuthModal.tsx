import { createSignal, Show, VoidComponent, Setter, Accessor, createEffect, onMount } from "solid-js";
import { signIn } from "@auth/solid-start/client";
import { useAction, useSubmission, revalidate } from "@solidjs/router";
import { request2FASetupDetailsAction, verifyAndEnable2FAAction } from "~/server/actions/authActions";
import { getAuthSession } from "~/server/queries/sessionQueries";

type TwoFactorAuthMode = "SETUP" | "LOGIN";

interface TwoFactorAuthModalProps {
    isOpen: Accessor<boolean>;
    setIsOpen: Setter<boolean>;
    onSuccess: () => void;
    mode: Accessor<TwoFactorAuthMode>;
    email: Accessor<string>;
    passwordForLogin?: Accessor<string | undefined>;
}

const TwoFactorAuthModal: VoidComponent<TwoFactorAuthModalProps> = (props) => {
    const [otp, setOtp] = createSignal("");
    const [otpauthUrl, setOtpauthUrl] = createSignal("");
    const [qrCodeDataUrl, setQrCodeDataUrl] = createSignal("");
    let otpInputRef: HTMLInputElement | undefined;


    const execRequest2FADetails = useAction(request2FASetupDetailsAction);
    const execVerifyAndEnable2FA = useAction(verifyAndEnable2FAAction);

    const requestDetailsSubmission = useSubmission(request2FASetupDetailsAction);
    const verifyEnableSubmission = useSubmission(verifyAndEnable2FAAction);

    const resetLocalState = () => {
        setOtp("");
        setOtpauthUrl("");
        setQrCodeDataUrl("");
        requestDetailsSubmission.clear();
        verifyEnableSubmission.clear();
    };

    createEffect(() => {
        if (props.isOpen() && props.mode() === "SETUP") {
            handleRequest2FADetails();
        }
        if (!props.isOpen()) {
            resetLocalState();
        }
    });

    createEffect(() => {
        if (props.isOpen() && otpInputRef) {
            if ((props.mode() === "SETUP" && qrCodeDataUrl()) || props.mode() === "LOGIN") {
                setTimeout(() => otpInputRef?.focus(), 50);
            }
        }
    });


    const handleRequest2FADetails = async () => {
        const formData = new FormData();
        formData.append("email", props.email());
        const result = await execRequest2FADetails(formData);

        if (result) {
            setOtpauthUrl(result.otpauthUrl);
            setQrCodeDataUrl(result.qrCodeDataUrl || "");
        }
    };

    const handleSetup2FASubmit = async (e: SubmitEvent) => {
        e.preventDefault();

        const result = await execVerifyAndEnable2FA({ email: props.email(), otp: otp() });

        if (result?.error) {
            setOtp("");
            return;
        }

        if (result?.status === "2FA_SETUP_COMPLETE") {
            revalidate(getAuthSession.key);
            setTimeout(() => {
                props.onSuccess();
                props.setIsOpen(false);
            }, 1500);
        }
    };

    const handleLoginWith2FASubmit = async (e: SubmitEvent) => {
        e.preventDefault();

        const result = await signIn("credentials", {
            redirect: false,
            email: props.email(),
            password: props.passwordForLogin?.() || "",
            otp: otp(),
        });

        if (!result?.ok || result?.error) {
            setOtp("");
            verifyEnableSubmission.setError({
                message: result?.error || "Code OTP invalide ou erreur de connexion.",
                error: result?.error || "Code OTP invalide ou erreur de connexion."
            });
        } else {
            revalidate(getAuthSession.key);
            props.onSuccess();
            props.setIsOpen(false);
        }
    };

    const handleClose = () => {
        if (requestDetailsSubmission.pending || verifyEnableSubmission.pending) return;
        props.setIsOpen(false);
    };

    return (
        <Show when={props.isOpen()}>
            <div class="fixed inset-0 z-[65] flex items-center justify-center bg-scrim/50 p-4">
                <div class="bg-surface-container p-6 rounded-mat-corner-large shadow-mat-level3 w-full max-w-md m-4 relative">
                    <button
                        onClick={handleClose}
                        disabled={requestDetailsSubmission.pending || verifyEnableSubmission.pending}
                        class="absolute top-4 right-4 p-2 rounded-mat-corner-full hover:bg-surface-container-high text-on-surface-variant"
                        aria-label="Fermer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" /></svg>
                    </button>

                    <Show when={props.mode() === "SETUP"}>
                        <form onSubmit={handleSetup2FASubmit} class="space-y-4">
                            <h2 class="text-headline-small text-on-surface">Configurer l'Authentification à Deux Facteurs</h2>
                            <Show when={requestDetailsSubmission.pending}>
                                <p class="text-body-medium text-on-surface-variant text-center py-8">Chargement des détails 2FA...</p>
                            </Show>
                            <Show when={!requestDetailsSubmission.pending && (otpauthUrl() || qrCodeDataUrl())}>
                                <p class="text-body-medium text-on-surface-variant">Scannez ce QR code avec votre application d'authentification :</p>
                                <Show when={qrCodeDataUrl()} fallback={<p class="text-body-medium text-on-surface-variant">Génération du QR code...</p>}>
                                    <div class="p-2 bg-white inline-block my-2 rounded-mat-corner-small">
                                        <img src={qrCodeDataUrl()} alt="QR Code pour 2FA" class="block mx-auto" />
                                    </div>
                                </Show>
                                <Show when={!qrCodeDataUrl() && otpauthUrl()}>
                                    <p class="text-body-small text-on-surface-variant">La génération du QR code a échoué, vous pouvez entrer cette clé manuellement :</p>
                                </Show>
                                <Show when={otpauthUrl()}>
                                    <p class="text-label-small text-on-surface-variant">Clé: <code class="bg-surface-variant text-on-surface-variant p-1 rounded-mat-corner-extra-small text-xs break-all">{otpauthUrl() ? new URL(otpauthUrl()).searchParams.get("secret") : ""}</code></p>
                                </Show>
                                <div>
                                    <label for="otp-setup" class="block text-label-large text-on-surface-variant">Code de Vérification (6 chiffres)</label>
                                    <input ref={otpInputRef} type="text" id="otp-setup" inputmode="numeric" value={otp()} onInput={(e) => setOtp(e.currentTarget.value)} required pattern="\\d{6}" title="Le code doit être composé de 6 chiffres" class="mt-1 block w-full rounded-mat-corner-small border-outline bg-surface text-on-surface shadow-sm focus:border-primary py-2 px-3" autocomplete="one-time-code" />
                                </div>
                            </Show>
                            <Show when={verifyEnableSubmission.result && !verifyEnableSubmission.error}>
                                <p class="text-green-500 text-body-medium text-center">{verifyEnableSubmission.result.message}</p>
                            </Show>
                            <Show when={verifyEnableSubmission.error}>
                                <p class="text-error text-body-small text-center">{(verifyEnableSubmission.error as any)?.message || "Code OTP invalide."}</p>
                            </Show>
                            <button type="submit" disabled={verifyEnableSubmission.pending || requestDetailsSubmission.pending || !otpauthUrl()} class="w-full rounded-mat-corner-full bg-primary px-4 py-2.5 text-on-primary hover:brightness-110 disabled:opacity-50 font-label-large">
                                {verifyEnableSubmission.pending ? "Vérification..." : "Vérifier et Activer 2FA"}
                            </button>
                        </form>
                    </Show>

                    <Show when={props.mode() === "LOGIN"}>
                        <form onSubmit={handleLoginWith2FASubmit} class="space-y-4">
                            <h2 class="text-headline-small text-on-surface">Vérification à Deux Facteurs</h2>
                            <p class="text-body-medium text-on-surface-variant">Entrez le code de votre application d'authentification.</p>
                            <div>
                                <label for="otp-login" class="block text-label-large text-on-surface-variant">Code 2FA (6 chiffres)</label>
                                <input ref={otpInputRef} type="text" id="otp-login" value={otp()} onInput={(e) => setOtp(e.currentTarget.value)} required pattern="\\d{6}" title="Le code doit être composé de 6 chiffres" class="mt-1 block w-full rounded-mat-corner-small border-outline bg-surface text-on-surface shadow-sm focus:border-primary py-2 px-3" autocomplete="one-time-code" />
                            </div>
                            <Show when={verifyEnableSubmission.error}>
                                <p class="text-error text-body-small text-center">{(verifyEnableSubmission.error as any)?.message || "Code OTP invalide ou erreur."}</p>
                            </Show>
                            <button type="submit" disabled={verifyEnableSubmission.pending} class="w-full rounded-mat-corner-full bg-primary px-4 py-2.5 text-on-primary hover:brightness-110 disabled:opacity-50 font-label-large">
                                {verifyEnableSubmission.pending ? "Connexion..." : "Se Connecter"}
                            </button>
                        </form>
                    </Show>
                </div>
            </div>
        </Show>
    );
};

export default TwoFactorAuthModal;

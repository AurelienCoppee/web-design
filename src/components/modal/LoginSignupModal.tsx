import { createSignal, Show, VoidComponent, Setter, Accessor, createEffect } from "solid-js";
import { signIn } from "@auth/solid-start/client";
import { useAction, useSubmission, revalidate } from "@solidjs/router";
import { startAuthFlowAction, createUserAction } from "~/server/actions/authActions";
import { getAuthSession } from "~/server/queries/sessionQueries";

type LoginSignupStep = "EMAIL_PASSWORD_INPUT" | "SIGNUP_DETAILS_CONFIRM" | "PROMPT_INITIAL_2FA";

interface LoginSignupModalProps {
    isOpen: Accessor<boolean>;
    setIsOpen: Setter<boolean>;
    onSuccess: () => void;
    onPrompt2FA: (email: string, password?: string) => void;
    onRequire2FA: (email: string, password?: string) => void;
}

const LoginSignupModal: VoidComponent<LoginSignupModalProps> = (props) => {
    const [email, setEmail] = createSignal("");
    const [password, setPassword] = createSignal("");
    const [firstPasswordAttempt, setFirstPasswordAttempt] = createSignal("");
    const [confirmPassword, setConfirmPassword] = createSignal("");
    const [emailVerificationCode, setEmailVerificationCode] = createSignal("");

    const [step, setStep] = createSignal<LoginSignupStep>("EMAIL_PASSWORD_INPUT");

    const execStartAuthFlow = useAction(startAuthFlowAction);
    const execCreateUser = useAction(createUserAction);

    const initialFormSubmission = useSubmission(startAuthFlowAction);
    const signupConfirmSubmission = useSubmission(createUserAction);

    createEffect(() => {
        if (!props.isOpen()) {
            setEmail("");
            setPassword("");
            setFirstPasswordAttempt("");
            setConfirmPassword("");
            setEmailVerificationCode("");
            setStep("EMAIL_PASSWORD_INPUT");
            initialFormSubmission.clear();
            signupConfirmSubmission.clear();
        }
    });


    const handleInitialSubmit = async (e: SubmitEvent) => {
        e.preventDefault();
        setFirstPasswordAttempt(password());

        const result = await execStartAuthFlow({ email: email(), password: password() });

        if (result?.error) {
            return;
        }

        if (result?.email) setEmail(result.email);

        if (result?.status === "NEW_USER_CONFIRM_PASSWORD") {
            setStep("SIGNUP_DETAILS_CONFIRM");
        } else if (result?.status === "LOGIN_SUCCESS_PROMPT_2FA_SETUP") {
            setStep("PROMPT_INITIAL_2FA");
        } else if (result?.status === "LOGIN_SUCCESS_NO_PROMPT_NEEDED") {
            const signInResult = await signIn("credentials", {
                redirect: false,
                email: email(),
                password: password(),
            });
            if (!signInResult?.ok || signInResult?.error) {
                setPassword("");
            } else {
                revalidate(getAuthSession.key);
                props.onSuccess();
                props.setIsOpen(false);
            }
        } else if (result?.status === "2FA_REQUIRED") {
            props.onRequire2FA(email(), password());
            props.setIsOpen(false);
        } else {
        }
    };

    const handleSignupConfirmSubmit = async (e: SubmitEvent) => {
        e.preventDefault();

        const result = await execCreateUser({
            email: email(),
            originalPassword: firstPasswordAttempt(),
            confirmPassword: confirmPassword(),
            emailVerificationCode: emailVerificationCode()
        });

        if (result?.error) {
            return;
        }

        if (result?.status === "SIGNUP_SUCCESS_PROMPT_2FA_SETUP") {
            setPassword(firstPasswordAttempt());
            setStep("PROMPT_INITIAL_2FA");
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            await signIn("google", { callbackUrl: window.location.pathname });
            props.onSuccess();
            props.setIsOpen(false);
        } catch (e: any) {
            console.error("Google Sign-In error:", e);
        }
    };

    const handle2FAPromptChoice = async (setupNow: boolean) => {
        if (setupNow) {
            props.onPrompt2FA(email(), password());
            props.setIsOpen(false);
        } else {
            const result = await signIn("credentials", {
                redirect: false,
                email: email(),
                password: password(),
            });
            if (!result?.ok || result?.error) {
                setPassword("");
            } else {
                revalidate(getAuthSession.key);
                props.onSuccess();
                props.setIsOpen(false);
            }
        }
    };

    const handleClose = () => {
        if (initialFormSubmission.pending || signupConfirmSubmission.pending) return;
        props.setIsOpen(false);
    };

    return (
        <Show when={props.isOpen()}>
            <div class="fixed inset-0 z-[60] flex items-center justify-center bg-scrim/50 p-4">
                <div class="bg-surface-container p-6 rounded-mat-corner-extra-large shadow-mat-level3 w-full max-w-md m-4 relative max-h-[90vh] overflow-y-auto">
                    <button
                        onClick={handleClose}
                        disabled={initialFormSubmission.pending || signupConfirmSubmission.pending}
                        class="absolute top-4 right-4 p-2 rounded-mat-corner-full hover:bg-surface-container-high text-on-surface-variant"
                        aria-label="Fermer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" /></svg>
                    </button>

                    <Show when={step() === "EMAIL_PASSWORD_INPUT"}>
                        <form onSubmit={handleInitialSubmit} class="space-y-6">
                            <h2 class="text-headline-small text-center text-on-surface">Connexion / Inscription</h2>
                            <div>
                                <label for="email-initial" class="block text-label-large text-on-surface-variant">Email</label>
                                <input type="email" id="email-initial" value={email()} onInput={(e) => setEmail(e.currentTarget.value)} required class="mt-1 block w-full rounded-mat-corner-small border-outline bg-surface text-on-surface shadow-sm focus:border-primary py-2 px-3" autocomplete="email" />
                            </div>
                            <div>
                                <label for="password-initial" class="block text-label-large text-on-surface-variant">Mot de passe</label>
                                <input type="password" id="password-initial" value={password()} onInput={(e) => setPassword(e.currentTarget.value)} required class="mt-1 block w-full rounded-mat-corner-small border-outline bg-surface text-on-surface shadow-sm focus:border-primary py-2 px-3" autocomplete="current-password" />
                            </div>
                            <button type="submit" disabled={initialFormSubmission.pending} class="w-full rounded-mat-corner-full bg-primary px-4 py-2.5 text-on-primary hover:brightness-110 disabled:opacity-50 font-label-large">
                                {initialFormSubmission.pending ? "Chargement..." : "Continuer"}
                            </button>
                            <div class="relative flex py-3 items-center">
                                <div class="flex-grow border-t border-outline-variant"></div>
                                <span class="flex-shrink mx-4 text-body-small text-on-surface-variant">Ou</span>
                                <div class="flex-grow border-t border-outline-variant"></div>
                            </div>
                            <button type="button" onClick={handleGoogleSignIn} disabled={initialFormSubmission.pending} class="w-full flex items-center justify-center gap-2 rounded-mat-corner-full border border-outline bg-surface px-4 py-2.5 text-on-surface hover:bg-surface-container-low disabled:opacity-50 font-label-large">
                                <img src="/images/google.webp" alt="Google logo" class="w-5 h-5" />
                                Se connecter avec Google
                            </button>
                        </form>
                    </Show>

                    <Show when={step() === "SIGNUP_DETAILS_CONFIRM"}>
                        <form onSubmit={handleSignupConfirmSubmit} class="space-y-4">
                            <h2 class="text-headline-small text-on-surface">Finaliser l'inscription</h2>
                            <div>
                                <label for="email-confirm" class="block text-label-large text-on-surface-variant">Email</label>
                                <input type="email" id="email-confirm" value={email()} readOnly class="mt-1 block w-full rounded-mat-corner-small border-outline bg-surface-container-low text-on-surface shadow-sm py-2 px-3" />
                            </div>
                            <div>
                                <label for="password-original-readonly" class="block text-label-large text-on-surface-variant">Mot de passe initial</label>
                                <input type="password" id="password-original-readonly" value={firstPasswordAttempt()} readOnly class="mt-1 block w-full rounded-mat-corner-small border-outline bg-surface-container-low text-on-surface shadow-sm py-2 px-3" />
                            </div>
                            <div>
                                <label for="password-confirm-signup" class="block text-label-large text-on-surface-variant">Confirmer le mot de passe</label>
                                <input type="password" id="password-confirm-signup" value={confirmPassword()} onInput={(e) => setConfirmPassword(e.currentTarget.value)} required class="mt-1 block w-full rounded-mat-corner-small border-outline bg-surface text-on-surface shadow-sm focus:border-primary py-2 px-3" autocomplete="new-password" />
                            </div>
                            <div>
                                <label for="email-verification-code" class="block text-label-large text-on-surface-variant">Code de vérification Email</label>
                                <input type="text" id="email-verification-code" value={emailVerificationCode()} onInput={(e) => setEmailVerificationCode(e.currentTarget.value)} placeholder="Code reçu par email (optionnel)" class="mt-1 block w-full rounded-mat-corner-small border-outline bg-surface text-on-surface shadow-sm focus:border-primary py-2 px-3" />
                            </div>
                            <button type="submit" disabled={signupConfirmSubmission.pending} class="w-full rounded-mat-corner-full bg-primary px-4 py-2.5 text-on-primary hover:brightness-110 disabled:opacity-50 font-label-large">
                                {signupConfirmSubmission.pending ? "Création..." : "Créer le compte"}
                            </button>
                        </form>
                    </Show>

                    <Show when={step() === "PROMPT_INITIAL_2FA"}>
                        <div class="space-y-4 text-center">
                            <h2 class="text-title-large font-semibold text-on-surface">Authentification à Deux Facteurs</h2>
                            <p class="text-body-medium text-on-surface-variant">Nous recommandons d'activer l'authentification à deux facteurs pour sécuriser votre compte.</p>
                            <div class="flex flex-col sm:flex-row gap-3 pt-2">
                                <button onClick={() => handle2FAPromptChoice(true)} class="flex-1 rounded-mat-corner-full bg-primary px-4 py-2.5 text-on-primary hover:brightness-110 font-label-large">
                                    Oui, Configurer 2FA
                                </button>
                                <button onClick={() => handle2FAPromptChoice(false)} class="flex-1 rounded-mat-corner-full bg-secondary-container px-4 py-2.5 text-on-secondary-container hover:brightness-110 font-label-large">
                                    Non, plus tard
                                </button>
                            </div>
                        </div>
                    </Show>
                </div>
            </div>
        </Show>
    );
};

export default LoginSignupModal;

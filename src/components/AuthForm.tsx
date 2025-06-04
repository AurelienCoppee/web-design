import { createSignal, Show, VoidComponent, createEffect, createMemo } from "solid-js";
import { signIn, signOut } from "@auth/solid-start/client";
import { createAsync, useAction, useSubmission, revalidate } from "@solidjs/router";
import {
  startAuthFlowAction,
  createUserAction,
  request2FASetupDetailsAction,
  verifyAndEnable2FAAction
} from "~/server/actions/authActions";
import { getAuthSession } from "~/server/queries/sessionQueries";
import type { Session } from "@auth/core/types";

export type AuthStep = "INITIAL" | "CONFIRM_PASSWORD_SIGNUP" | "PROMPT_INITIAL_2FA_SETUP" | "SETUP_2FA" | "ENTER_2FA" | "LOGGED_IN";

interface AuthFormProps {
  onSuccess?: () => void;
  initialAuthStep?: AuthStep;
}


const AuthForm: VoidComponent<AuthFormProps> = (props) => {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [otp, setOtp] = createSignal("");
  const [step, setStep] = createSignal<AuthStep>(props.initialAuthStep || "INITIAL");
  const [otpauthUrl, setOtpauthUrl] = createSignal("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = createSignal("");
  const [errorMessage, setErrorMessage] = createSignal("");
  const [infoMessage, setInfoMessage] = createSignal("");
  const [firstPasswordAttempt, setFirstPasswordAttempt] = createSignal("");

  const sessionAsync = createAsync(() => getAuthSession());
  const typedSession = createMemo(() => sessionAsync() as Session | null | undefined);


  const execStartAuthFlow = useAction(startAuthFlowAction);
  const execCreateUser = useAction(createUserAction);
  const execRequest2FADetails = useAction(request2FASetupDetailsAction);
  const execVerifyAndEnable2FA = useAction(verifyAndEnable2FAAction);

  const initialFormSubmission = useSubmission(startAuthFlowAction);
  const signupConfirmSubmission = useSubmission(createUserAction);
  const setup2FASubmission = useSubmission(verifyAndEnable2FAAction);


  createEffect(() => {
    const currentSession = typedSession();
    if (sessionAsync.loading) return;

    if (currentSession?.user && step() !== "SETUP_2FA") {
      setStep("LOGGED_IN");
    } else if (!currentSession?.user && step() === "LOGGED_IN") {
      setStep(props.initialAuthStep || "INITIAL");
    }
  });

  createEffect(() => {
    if (props.initialAuthStep && !typedSession()?.user) {
      setStep(props.initialAuthStep);
      if (props.initialAuthStep === "SETUP_2FA") {
        handleRequest2FASetupDetails();
      }
    }
  });

  createEffect(() => {
    let msg = "";
    if (initialFormSubmission.error) msg = initialFormSubmission.error.error?.message || initialFormSubmission.error.error || "Erreur initiale.";
    else if (signupConfirmSubmission.error) msg = signupConfirmSubmission.error.error?.message || signupConfirmSubmission.error.error || "Erreur d'inscription.";
    else if (setup2FASubmission.error) msg = setup2FASubmission.error.error?.message || setup2FASubmission.error.error || "Erreur configuration 2FA.";
    setErrorMessage(msg);
  });


  const handleRequest2FASetupDetails = async () => {
    setErrorMessage("");
    const result = await execRequest2FADetails();
    if (result?.error) {
      setErrorMessage(result.error.message || result.error || "Erreur lors de la récupération des détails 2FA.");
      setStep(typedSession()?.user ? "LOGGED_IN" : "INITIAL");
    } else if (result) {
      setOtpauthUrl(result.otpauthUrl);
      setQrCodeDataUrl(result.qrCodeDataUrl || "");
      setEmail(result.email);
      setStep("SETUP_2FA");
    }
  };

  const handleInitialSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setInfoMessage("");
    setFirstPasswordAttempt(password());

    const result = await execStartAuthFlow({ email: email(), password: password() });

    if (result?.error) {
      setErrorMessage(result.error.message || result.error);
      return;
    }

    if (result?.email) setEmail(result.email);

    if (result?.status === "NEW_USER_CONFIRM_PASSWORD") {
      setInfoMessage(result.message);
      setStep("CONFIRM_PASSWORD_SIGNUP");
    } else if (result?.status === "LOGIN_SUCCESS_PROMPT_2FA_SETUP") {
      setInfoMessage(result.message);
      setOtpauthUrl(result.otpauthUrl || "");
      setQrCodeDataUrl(result.qrCodeDataUrl || "");
      setStep("PROMPT_INITIAL_2FA_SETUP");
    } else if (result?.status === "2FA_REQUIRED") {
      setInfoMessage(result.message || "Code 2FA requis.");
      setStep("ENTER_2FA");
    } else {
      setErrorMessage("Réponse inattendue du serveur lors de l'initialisation.");
    }
  };

  const handleSignupConfirmSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (firstPasswordAttempt() !== confirmPassword()) {
      setErrorMessage("Les mots de passe ne correspondent pas.");
      return;
    }
    setErrorMessage("");
    setInfoMessage("");

    const result = await execCreateUser({ email: email(), password: firstPasswordAttempt(), confirmPassword: confirmPassword() });

    if (result?.error) {
      setErrorMessage(result.error.message || result.error);
      return;
    }

    if (result?.status === "SIGNUP_SUCCESS_PROMPT_2FA_SETUP") {
      setInfoMessage(result.message);
      setOtpauthUrl(result.otpauthUrl || "");
      setQrCodeDataUrl(result.qrCodeDataUrl || "");
      setPassword(firstPasswordAttempt());
      setStep("PROMPT_INITIAL_2FA_SETUP");
    } else {
      setErrorMessage("Réponse inattendue après la création du compte.");
    }
  };


  const handleGoogleSignIn = async () => {
    setErrorMessage("");
    setInfoMessage("Redirection vers Google...");
    try {
      await signIn("google");
      revalidate(getAuthSession.key);
      props.onSuccess?.();

    } catch (e: any) {
      console.error("Google Sign-In error:", e);
      setErrorMessage(e.message || "Une erreur s'est produite lors de la connexion avec Google.");
      setInfoMessage("");
    }
  };

  const handleInitial2FAPromptChoice = async (setupNow: boolean) => {
    if (setupNow) {
      if (!otpauthUrl()) {
        setErrorMessage("Détails de configuration 2FA manquants. Essayez de vous reconnecter.");
        setStep("INITIAL");
        return;
      }
      setStep("SETUP_2FA");
    } else {
      setInfoMessage("Connexion en cours...");
      const result = await signIn("credentials", {
        redirect: false,
        email: email(),
        password: password(),
      });
      if (!result?.ok || result?.error) {
        setErrorMessage(result?.error || "Erreur de connexion. Veuillez vérifier vos identifiants.");
        setPassword("");
      } else {
        setInfoMessage("Connexion réussie!");
        revalidate(getAuthSession.key);
        props.onSuccess?.();
      }
    }
  };

  const handleSetup2FASubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const result = await execVerifyAndEnable2FA({ email: email(), otp: otp() });

    if (result?.error) {
      setErrorMessage(result.error.message || result.error);
      setOtp("");
      return;
    }

    if (result?.status === "2FA_SETUP_COMPLETE") {
      setInfoMessage(result.message || "2FA activée avec succès!");
      revalidate(getAuthSession.key);

      if (step() === "PROMPT_INITIAL_2FA_SETUP" || (step() === "SETUP_2FA" && !typedSession()?.user?.isTwoFactorAuthenticated)) {
        setInfoMessage("2FA activée. Connexion en cours...");
        const signInResult = await signIn("credentials", {
          redirect: false,
          email: email(),
          password: password(),
          otp: otp(),
        });
        if (!signInResult?.ok || signInResult?.error) {
          setErrorMessage(signInResult?.error || "Erreur de connexion après l'activation de la 2FA.");
          setStep("ENTER_2FA");
        } else {
          revalidate(getAuthSession.key);
          props.onSuccess?.();
        }
      } else {
        props.onSuccess?.();
      }
      setOtp("");
    } else {
      setErrorMessage("Réponse inattendue lors de la configuration de la 2FA.");
    }
  };


  const handleLoginWith2FASubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setErrorMessage("");
    const result = await signIn("credentials", {
      redirect: false,
      email: email(),
      password: password(),
      otp: otp(),
    });

    if (!result?.ok || result?.error) {
      if (result?.error?.includes("Code OTP invalide") || result?.error?.includes("Mot de passe invalide") || result?.error?.includes("Identifiants invalides")) {
        setErrorMessage("Email, mot de passe ou code 2FA invalide.");
      } else {
        setErrorMessage(result?.error || "Erreur de connexion inconnue.");
      }
      setOtp("");
    } else {
      revalidate(getAuthSession.key);
      props.onSuccess?.();
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setOtp("");
    setErrorMessage("");
    setInfoMessage("");
    setOtpauthUrl("");
    setQrCodeDataUrl("");
    setFirstPasswordAttempt("");
    setStep("INITIAL");
    revalidate(getAuthSession.key);
  };


  return (
    <div class="container mx-auto p-4 max-w-md">
      <Show when={step() === "INITIAL"}>
        <form onSubmit={handleInitialSubmit} class="space-y-6">
          <h2 class="text-2xl font-bold text-center text-on-surface">Connexion / Inscription</h2>
          <div>
            <label for="email-initial" class="block text-sm font-medium text-on-surface-variant">Email</label>
            <input type="email" id="email-initial" value={email()} onInput={(e) => setEmail(e.currentTarget.value)} required class="mt-1 block w-full rounded-md border-outline bg-surface text-on-surface shadow-sm focus:border-primary" autocomplete="email" />
          </div>
          <div>
            <label for="password-initial" class="block text-sm font-medium text-on-surface-variant">Mot de passe</label>
            <input type="password" id="password-initial" value={password()} onInput={(e) => setPassword(e.currentTarget.value)} required class="mt-1 block w-full rounded-md border-outline bg-surface text-on-surface shadow-sm focus:border-primary" autocomplete="current-password" />
          </div>
          <button type="submit" disabled={initialFormSubmission.pending} class="w-full rounded-md bg-primary px-4 py-2 text-on-primary hover:brightness-110 disabled:opacity-50">
            {initialFormSubmission.pending ? "Chargement..." : "Continuer"}
          </button>
          <div class="relative flex py-3 items-center">
            <div class="flex-grow border-t border-outline-variant"></div>
            <span class="flex-shrink mx-4 text-on-surface-variant text-sm">Ou</span>
            <div class="flex-grow border-t border-outline-variant"></div>
          </div>
          <button type="button" onClick={handleGoogleSignIn} disabled={initialFormSubmission.pending} class="w-full flex items-center justify-center gap-2 rounded-md border border-outline bg-surface px-4 py-2 text-on-surface hover:bg-surface-variant disabled:opacity-50">
            <svg class="w-5 h-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 65.9L351.5 129.7c-24.3-23.5-57.5-39.9-93.5-39.9-70.5 0-127.5 57.3-127.5 128s57 128 127.5 128c79.1 0 108.5-59.3 112.5-90.9H248v-64h239.5c1.4 12.3 2.5 24.4 2.5 36.8z"></path></svg>
            Se connecter avec Google
          </button>
        </form>
      </Show>

      <Show when={step() === "CONFIRM_PASSWORD_SIGNUP"}>
        <form onSubmit={handleSignupConfirmSubmit} class="space-y-4">
          <h2 class="text-2xl font-bold text-on-surface">Confirmer le mot de passe</h2>
          <p class="text-on-surface-variant">{infoMessage()}</p>
          <div>
            <label for="email-confirm" class="block text-sm font-medium text-on-surface-variant">Email</label>
            <input type="email" id="email-confirm" value={email()} readOnly class="mt-1 block w-full rounded-md border-outline bg-surface-container-low text-on-surface shadow-sm" />
          </div>
          <div>
            <label for="password-confirm" class="block text-sm font-medium text-on-surface-variant">Confirmer le mot de passe</label>
            <input type="password" id="password-confirm" value={confirmPassword()} onInput={(e) => setConfirmPassword(e.currentTarget.value)} required class="mt-1 block w-full rounded-md border-outline bg-surface text-on-surface shadow-sm focus:border-primary" autocomplete="new-password" />
          </div>
          <button type="submit" disabled={signupConfirmSubmission.pending} class="w-full rounded-md bg-primary px-4 py-2 text-on-primary hover:brightness-110 disabled:opacity-50">
            {signupConfirmSubmission.pending ? "Création..." : "Créer le compte"}
          </button>
        </form>
      </Show>

      <Show when={step() === "PROMPT_INITIAL_2FA_SETUP"}>
        <div class="space-y-4">
          <h2 class="text-2xl font-bold text-on-surface">Authentification à Deux Facteurs</h2>
          <p class="text-on-surface-variant">{infoMessage()}</p>
          <Show when={qrCodeDataUrl() && otpauthUrl()}>
            <p class="text-on-surface-variant text-sm">Si vous souhaitez l'activer maintenant, scannez ce QR code ou utilisez la clé ci-dessous avec votre application d'authentification.</p>
            <div class="p-2 bg-white inline-block my-2 rounded"><img src={qrCodeDataUrl()} alt="QR Code 2FA" /></div>
            <p class="text-xs text-on-surface-variant">Clé: <code class="bg-surface-variant text-on-surface-variant p-1 rounded text-xs break-all">{otpauthUrl() ? new URL(otpauthUrl()).searchParams.get("secret") : ""}</code></p>
          </Show>
          <Show when={!qrCodeDataUrl() && otpauthUrl()}>
            <p class="text-on-surface-variant text-sm">La génération du QR code a échoué. Vous pouvez utiliser la clé suivante avec votre application d'authentification :</p>
            <p class="text-xs text-on-surface-variant">Clé: <code class="bg-surface-variant text-on-surface-variant p-1 rounded text-xs break-all">{otpauthUrl() ? new URL(otpauthUrl()).searchParams.get("secret") : ""}</code></p>
          </Show>
          <div class="flex gap-4">
            <button onClick={() => handleInitial2FAPromptChoice(true)} disabled={setup2FASubmission.pending || signupConfirmSubmission.pending} class="flex-1 rounded-md bg-primary px-4 py-2 text-on-primary hover:brightness-110 disabled:opacity-50">
              Oui, Configurer 2FA
            </button>
            <button onClick={() => handleInitial2FAPromptChoice(false)} disabled={setup2FASubmission.pending || signupConfirmSubmission.pending} class="flex-1 rounded-md bg-secondary-container px-4 py-2 text-on-secondary-container hover:brightness-110 disabled:opacity-50">
              Non, plus tard
            </button>
          </div>
        </div>
      </Show>

      <Show when={step() === "SETUP_2FA"}>
        <form onSubmit={handleSetup2FASubmit} class="space-y-4">
          <h2 class="text-2xl font-bold text-on-surface">Configurer l'Authentification à Deux Facteurs</h2>
          <p class="text-on-surface-variant">Scannez ce QR code avec votre application d'authentification :</p>
          <Show when={qrCodeDataUrl()} fallback={<p class="text-on-surface-variant">Génération du QR code...</p>}>
            <div class="p-2 bg-white inline-block my-2 rounded">
              <img src={qrCodeDataUrl()} alt="QR Code pour 2FA" />
            </div>
          </Show>
          <Show when={!qrCodeDataUrl() && otpauthUrl()}>
            <p class="text-on-surface-variant text-sm">La génération du QR code a échoué, mais vous pouvez entrer cette clé manuellement :</p>
          </Show>
          <Show when={otpauthUrl()}>
            <p class="text-xs text-on-surface-variant">Clé: <code class="bg-surface-variant text-on-surface-variant p-1 rounded text-xs break-all">{otpauthUrl() ? new URL(otpauthUrl()).searchParams.get("secret") : ""}</code></p>
          </Show>


          <div>
            <label for="otp-setup" class="block text-sm font-medium text-on-surface-variant">Code de Vérification (6 chiffres)</label>
            <input type="text" id="otp-setup" inputmode="numeric" value={otp()} onInput={(e) => setOtp(e.currentTarget.value)} required pattern="\\d{6}" title="Le code doit être composé de 6 chiffres" class="mt-1 block w-full rounded-md border-outline bg-surface text-on-surface shadow-sm focus:border-primary" autocomplete="one-time-code" />
          </div>
          <button type="submit" disabled={setup2FASubmission.pending} class="w-full rounded-md bg-primary px-4 py-2 text-on-primary hover:brightness-110 disabled:opacity-50">
            {setup2FASubmission.pending ? "Vérification..." : "Vérifier et Activer 2FA"}
          </button>
        </form>
      </Show>

      <Show when={step() === "ENTER_2FA"}>
        <form onSubmit={handleLoginWith2FASubmit} class="space-y-4">
          <h2 class="text-2xl font-bold text-on-surface">Vérification à Deux Facteurs</h2>
          <p class="text-on-surface-variant">{infoMessage() || "Entrez le code de votre application d'authentification."}</p>
          <div>
            <label for="otp-login" class="block text-sm font-medium text-on-surface-variant">Code 2FA (6 chiffres)</label>
            <input type="text" id="otp-login" value={otp()} onInput={(e) => setOtp(e.currentTarget.value)} required pattern="\\d{6}" title="Le code doit être composé de 6 chiffres" class="mt-1 block w-full rounded-md border-outline bg-surface text-on-surface shadow-sm focus:border-primary" autocomplete="one-time-code" />
          </div>
          <button type="submit" disabled={false} class="w-full rounded-md bg-primary px-4 py-2 text-on-primary hover:brightness-110 disabled:opacity-50">
            {false ? "Connexion..." : "Se Connecter"}
          </button>
        </form>
      </Show>

      <Show when={errorMessage()}>
        <p class="mt-4 text-sm bg-error-container text-on-error-container p-3 rounded-md whitespace-pre-wrap">{errorMessage()}</p>
      </Show>
      <Show when={infoMessage() && !["PROMPT_INITIAL_2FA_SETUP", "ENTER_2FA", "LOGGED_IN", "CONFIRM_PASSWORD_SIGNUP"].includes(step())}>
        <p class="mt-4 text-sm bg-primary-container text-on-primary-container p-3 rounded-md">{infoMessage()}</p>
      </Show>

      <Show when={step() === "LOGGED_IN" && typedSession()?.user}>
        <div class="space-y-4 text-center">
          <h2 class="text-2xl font-bold text-on-surface">Bienvenue, {typedSession()?.user?.name || typedSession()?.user?.email}!</h2>
          <p class="text-on-surface-variant">Vous êtes connecté.</p>
          <Show when={typedSession()?.user?.image}>
            <img src={typedSession()?.user?.image!} alt="Avatar" class="w-24 h-24 rounded-full mx-auto" />
          </Show>
          <Show when={typedSession()?.user?.provider === 'credentials' && !typedSession()?.user?.twoFactorEnabled}>
            <button
              onClick={handleRequest2FASetupDetails}
              disabled={execRequest2FADetails.pending}
              class="mt-2 rounded-md bg-secondary-container px-4 py-2 text-sm text-on-secondary-container hover:brightness-110 disabled:opacity-50"
            >
              {execRequest2FADetails.pending ? "Chargement..." : "Activer l'authentification à deux facteurs"}
            </button>
          </Show>
          <button
            onClick={handleSignOut}
            disabled={false}
            class="mt-4 w-full rounded-md bg-error-container px-4 py-2 text-on-error-container hover:brightness-110 disabled:opacity-50"
          >
            Se Déconnecter
          </button>
        </div>
      </Show>
    </div>
  );
};

export default AuthForm;

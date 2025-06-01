import { createSignal, Show, VoidComponent, createEffect } from "solid-js";
import { signIn, signOut } from "@auth/solid-start/client";
import QRCode from "qrcode";
import { query, createAsync } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";
import { getSession as getServerSession } from "@auth/solid-start";
import { authOptions } from "~/server/auth";

interface AuthFormProps {
  onSuccess?: () => void;
  initialStep?: "INITIAL" | "SETUP_2FA";
}

type AuthStep = "INITIAL" | "SETUP_2FA" | "ENTER_2FA" | "LOGGED_IN" | "PROMPT_2FA";

const getAuthSessionQueryForm = query(
  async () => {
    "use server";
    const event = getRequestEvent();
    if (!event) {
      console.error("No request event found on server for getAuthSessionQueryForm");
      return null;
    }
    try {
      return await getServerSession(event.request, authOptions);
    } catch (e) {
      console.error("Error fetching session in getAuthSessionQueryForm:", e);
      return null;
    }
  },
  "authSession"
);


const AuthForm: VoidComponent<AuthFormProps> = (props) => {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [otp, setOtp] = createSignal("");
  const [step, setStep] = createSignal<AuthStep>(props.initialStep || "INITIAL");
  const [otpauthUrl, setOtpauthUrl] = createSignal("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = createSignal("");
  const [errorMessage, setErrorMessage] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(false);
  const [isGoogleLoading, setIsGoogleLoading] = createSignal(false);
  const [infoMessage, setInfoMessage] = createSignal("");

  const [isInitial2FASetupFlow, setIsInitial2FASetupFlow] = createSignal(false);

  const sessionAsync = createAsync(() => getAuthSessionQueryForm());

  createEffect(() => {
    const currentSession = sessionAsync();
    if (sessionAsync.loading) return;

    if (currentSession && currentSession.user) {
      setStep("LOGGED_IN");
    } else {
      if (step() === "LOGGED_IN") {
        setStep(props.initialStep || "INITIAL");
      }
    }
  });

  createEffect(() => {
    if (props.initialStep && !sessionAsync()?.user) {
      setStep(props.initialStep);
      if (props.initialStep === "SETUP_2FA") {
        fetchOtpAuthUrlForLoggedInUser();
      }
    }
  });

  const fetchOtpAuthUrlForLoggedInUser = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/auth/request-2fa-setup-details", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error || "Erreur lors de la récupération des détails 2FA.");
        setStep("INITIAL");
      } else {
        setOtpauthUrl(data.otpauthUrl);
        setEmail(data.email);
        setStep("SETUP_2FA");
      }
    } catch (e) {
      setErrorMessage("Erreur serveur pour détails 2FA.");
      setStep("INITIAL");
    } finally {
      setIsLoading(false);
    }
  };


  createEffect(async () => {
    if (otpauthUrl() && (step() === "SETUP_2FA" || step() === "PROMPT_2FA")) {
      try {
        const url = await QRCode.toDataURL(otpauthUrl());
        setQrCodeDataUrl(url);
      } catch (err) {
        console.error("Failed to generate QR code", err);
        setErrorMessage("Erreur lors de la génération du QR code.");
        setQrCodeDataUrl("");
      }
    } else {
      setQrCodeDataUrl("");
    }
  });

  const handleInitialSubmit = async (e: Event) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    setInfoMessage("");
    try {
      const response = await fetch("/api/auth/start-auth-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email(), password: password() }),
      });
      const data = await response.json();
      setIsLoading(false);

      if (!response.ok) {
        setErrorMessage(data.error || `Erreur ${response.status}`);
        return;
      }

      if (data.email) setEmail(data.email);

      if (data.status === "SIGNUP_SUCCESS_PROMPT_2FA" || data.status === "LOGIN_SUCCESS_PROMPT_2FA") {
        setInfoMessage(data.message);
        setOtpauthUrl(data.otpauthUrl || "");
        setIsInitial2FASetupFlow(true);
        setStep("PROMPT_2FA");
      } else if (data.status === "2FA_REQUIRED") {
        setInfoMessage(data.message || "Code 2FA requis.");
        setIsInitial2FASetupFlow(false);
        setStep("ENTER_2FA");
      } else {
        const result = await signIn("credentials", {
          redirect: false,
          email: email(),
          password: password(),
        });
        if (!result?.ok) {
          setErrorMessage(result?.error || "Erreur de connexion après tentative initiale.");
          setPassword("");
        } else {
          setInfoMessage(data.message || "Connexion réussie !");
          props.onSuccess?.();
        }
      }
    } catch (error) {
      setIsLoading(false);
      console.error("Catch block error:", error);
      setErrorMessage("Erreur de connexion au serveur.");
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMessage("");
    setInfoMessage("Redirection vers Google...");
    try {
      const result = await signIn("google", { redirect: false });

      if (result?.url) {
        window.location.href = result.url;
        return;
      }

      if (result && !result.ok) {
        setErrorMessage(result.error || "Erreur lors de la connexion avec Google.");
        setInfoMessage("");
      } else if (result?.ok) {
        props.onSuccess?.();
      }
    } catch (e) {
      console.error("Google Sign-In error:", e);
      setErrorMessage("Une erreur s'est produite lors de la connexion avec Google.");
      setInfoMessage("");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handle2FAPromptChoice = async (setupNow: boolean) => {
    if (setupNow) {
      if (!otpauthUrl()) {
        setErrorMessage("URL de configuration 2FA manquante. Veuillez réessayer.");
        setStep("INITIAL");
        return;
      }
      setStep("SETUP_2FA");
    } else {
      setIsLoading(true);
      setErrorMessage("");
      setInfoMessage("Tentative de connexion...");
      const result = await signIn("credentials", {
        redirect: false,
        email: email(),
        password: password(),
      });
      setIsLoading(false);
      if (!result?.ok) {
        setErrorMessage(result?.error || "Erreur de connexion. Veuillez vérifier vos identifiants.");
        setPassword("");
      } else {
        setInfoMessage("Connexion réussie!");
        props.onSuccess?.();
      }
    }
  };

  const handleSetup2FASubmit = async (e: Event) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/auth/verify-2fa-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email(), otp: otp() }),
      });
      const data = await response.json();
      setIsLoading(false);

      if (!response.ok) {
        setErrorMessage(data.error || "Erreur lors de la vérification du code 2FA.");
        setOtp("");
        return;
      }

      if (data.status === "2FA_SETUP_COMPLETE") {
        setInfoMessage("2FA activée avec succès!");

        if (isInitial2FASetupFlow()) {
          setInfoMessage("2FA activée. Connexion en cours...");
          const result = await signIn("credentials", {
            redirect: false,
            email: email(),
            password: password(),
            otp: otp(),
          });
          if (!result?.ok) {
            setErrorMessage(result?.error || "Erreur de connexion post-setup 2FA.");
            setStep("ENTER_2FA");
          } else {
            props.onSuccess?.();
          }
        } else {
          const updatedSession = await getAuthSessionQueryForm.refetch();
          if (updatedSession?.user) {
            setStep("LOGGED_IN");
          }
          props.onSuccess?.();
        }
        setOtp("");
      } else {
        setErrorMessage("Réponse inattendue lors du setup 2FA.");
      }
    } catch (error) {
      setIsLoading(false);
      setErrorMessage("Erreur de communication pour le setup 2FA.");
      setOtp("");
    }
  };

  const handleLoginWith2FASubmit = async (e: Event) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    const result = await signIn("credentials", {
      redirect: false,
      email: email(),
      password: password(),
      otp: otp(),
    });
    setIsLoading(false);
    if (!result?.ok) {
      if (result?.error?.includes("Code OTP invalide") || result?.error?.includes("Mot de passe invalide") || result?.error?.includes("Identifiants invalides")) {
        setErrorMessage("Email, mot de passe ou code 2FA invalide.");
      } else {
        setErrorMessage(result?.error || "Erreur de connexion inconnue.");
      }
      setOtp("");
    } else {
      props.onSuccess?.();
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOut({ redirect: false });
    setEmail("");
    setPassword("");
    setOtp("");
    setErrorMessage("");
    setInfoMessage("");
    setOtpauthUrl("");
    setQrCodeDataUrl("");
    setIsInitial2FASetupFlow(false);
    setStep("INITIAL");
    setIsLoading(false);
  };

  return (
    <div class="container mx-auto p-4 max-w-md">
      <Show when={sessionAsync.loading && step() !== 'LOGGED_IN'}>
        <p class="text-on-surface">Chargement...</p>
      </Show>

      <Show when={step() === "LOGGED_IN" && sessionAsync()?.user}>
        <div class="space-y-4 text-center">
          <h2 class="text-2xl font-bold text-on-surface">Bienvenue !</h2>
          <p class="text-on-surface-variant">Connecté en tant que {sessionAsync()?.user?.email}</p>
          <button onClick={handleSignOut} disabled={isLoading()} class="w-full rounded-md bg-error px-4 py-2 text-on-error hover:brightness-90 disabled:opacity-50">
            {isLoading() ? "Déconnexion..." : "Se déconnecter"}
          </button>
        </div>
      </Show>

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
          <button type="submit" disabled={isLoading() || isGoogleLoading()} class="w-full rounded-md bg-primary px-4 py-2 text-on-primary hover:brightness-110 disabled:opacity-50">
            {isLoading() ? "Chargement..." : "Continuer avec Email"}
          </button>

          <div class="relative flex py-3 items-center">
            <div class="flex-grow border-t border-outline-variant"></div>
            <span class="flex-shrink mx-4 text-on-surface-variant text-sm">Ou</span>
            <div class="flex-grow border-t border-outline-variant"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading() || isGoogleLoading()}
            class="w-full flex items-center justify-center gap-2 rounded-md border border-outline bg-surface px-4 py-2 text-on-surface hover:bg-surface-variant disabled:opacity-50"
          >
            <svg class="w-5 h-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
              <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 65.9L351.5 129.7c-24.3-23.5-57.5-39.9-93.5-39.9-70.5 0-127.5 57.3-127.5 128s57 128 127.5 128c79.1 0 108.5-59.3 112.5-90.9H248v-64h239.5c1.4 12.3 2.5 24.4 2.5 36.8z"></path>
            </svg>
            {isGoogleLoading() ? "Redirection..." : "Se connecter avec Google"}
          </button>
        </form>
      </Show>

      <Show when={step() === "PROMPT_2FA"}>
        <div class="space-y-4">
          <h2 class="text-2xl font-bold text-on-surface">Authentification à Deux Facteurs</h2>
          <p class="text-on-surface-variant">{infoMessage() || "Voulez-vous configurer l'authentification à deux facteurs pour plus de sécurité ?"}</p>
          <Show when={qrCodeDataUrl() && otpauthUrl()}>
            <p class="text-on-surface-variant text-sm">Si oui, vous pouvez scanner ce QR code ou utiliser la clé ci-dessous.</p>
            <div class="p-2 bg-white inline-block my-2 rounded"><img src={qrCodeDataUrl()} alt="QR Code 2FA" /></div>
            <p class="text-xs text-on-surface-variant">Clé: <code class="bg-surface-variant text-on-surface-variant p-1 rounded text-xs">{new URL(otpauthUrl()).searchParams.get("secret")}</code></p>
          </Show>
          <div class="flex gap-4">
            <button onClick={() => handle2FAPromptChoice(true)} disabled={isLoading()} class="flex-1 rounded-md bg-primary px-4 py-2 text-on-primary hover:brightness-110 disabled:opacity-50">
              {isLoading() ? "..." : "Oui, Configurer 2FA"}
            </button>
            <button onClick={() => handle2FAPromptChoice(false)} disabled={isLoading()} class="flex-1 rounded-md bg-secondary-container px-4 py-2 text-on-secondary-container hover:brightness-110 disabled:opacity-50">
              {isLoading() ? "..." : "Non, plus tard"}
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
            <p class="text-xs text-on-surface-variant">Ou entrez cette clé manuellement : <code class="bg-surface-variant text-on-surface-variant p-1 rounded text-xs">{
              otpauthUrl() ? new URL(otpauthUrl()).searchParams.get("secret") : ""
            }</code></p>
          </Show>
          <div>
            <label for="otp-setup" class="block text-sm font-medium text-on-surface-variant">Code de Vérification (6 chiffres)</label>
            <input type="text" id="otp-setup" inputmode="numeric" value={otp()} onInput={(e) => setOtp(e.currentTarget.value)} required pattern="\\d{6}" title="Le code doit être composé de 6 chiffres" class="mt-1 block w-full rounded-md border-outline bg-surface text-on-surface shadow-sm focus:border-primary" autocomplete="one-time-code" />
          </div>
          <button type="submit" disabled={isLoading()} class="w-full rounded-md bg-primary px-4 py-2 text-on-primary hover:brightness-110 disabled:opacity-50">
            {isLoading() ? "Vérification..." : "Vérifier et Activer 2FA"}
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
          <button type="submit" disabled={isLoading()} class="w-full rounded-md bg-primary px-4 py-2 text-on-primary hover:brightness-110 disabled:opacity-50">
            {isLoading() ? "Connexion..." : "Se Connecter"}
          </button>
        </form>
      </Show>

      <Show when={errorMessage()}>
        <p class="mt-4 text-error">{errorMessage()}</p>
      </Show>
      <Show when={infoMessage() && step() !== "PROMPT_2FA" && step() !== "ENTER_2FA" && step() !== "LOGGED_IN"}>
        <p class="mt-4 text-primary">{infoMessage()}</p>
      </Show>
    </div>
  );
};

export default AuthForm;

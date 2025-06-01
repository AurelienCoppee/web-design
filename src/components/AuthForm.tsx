import { createSignal, Show, VoidComponent, createEffect } from "solid-js";
import { signIn, signOut } from "@auth/solid-start/client";
import { useNavigate } from "@solidjs/router";
import QRCode from "qrcode";
import { query, createAsync } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";
import { getSession as getServerSession } from "@auth/solid-start";
import { authOptions } from "~/server/auth";

interface AuthFormProps {
  onSuccess?: () => void;
}

const getAuthSessionQuery = query(
  async () => {
    "use server";
    const event = getRequestEvent();
    if (!event) {
      console.error("No request event found on server for getAuthSessionQuery");
      return null;
    }
    try {
      return await getServerSession(event.request, authOptions);
    } catch (e) {
      console.error("Error fetching session in getAuthSessionQuery:", e);
      return null;
    }
  },
  "authSession"
);


const AuthForm: VoidComponent<AuthFormProps> = (props) => {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [otp, setOtp] = createSignal("");
  const [step, setStep] = createSignal<"INITIAL" | "SETUP_2FA" | "ENTER_2FA" | "LOGGED_IN">("INITIAL");
  const [otpauthUrl, setOtpauthUrl] = createSignal("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = createSignal("");
  const [errorMessage, setErrorMessage] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(false);
  const [infoMessage, setInfoMessage] = createSignal("");

  const sessionAsync = createAsync(() => getAuthSessionQuery());

  createEffect(() => {
    const currentSession = sessionAsync();
    if (sessionAsync.loading) {
      return;
    }
    if (currentSession && currentSession.user) {
      setStep("LOGGED_IN");
    } else {
      if (step() === "LOGGED_IN") {
        setStep("INITIAL");
      }
    }
  });

  createEffect(async () => {
    if (otpauthUrl() && step() === "SETUP_2FA") {
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
      if (data.message) setInfoMessage(data.message);

      if (data.status === "SETUP_2FA_REQUIRED") {
        setOtpauthUrl(data.otpauthUrl);
        if (data.email) setEmail(data.email);
        setStep("SETUP_2FA");
      } else if (data.status === "2FA_REQUIRED") {
        if (data.email) setEmail(data.email);
        setStep("ENTER_2FA");
      } else if (data.error) {
        setErrorMessage(data.error);
      } else {
        setErrorMessage("Réponse inattendue du serveur.");
      }
    } catch (error) {
      setIsLoading(false);
      console.error("Catch block error:", error);
      setErrorMessage("Erreur de connexion au serveur.");
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

      if (!response.ok) {
        setErrorMessage(data.error || "Erreur lors de la vérification du code 2FA.");
        setIsLoading(false);
        return;
      }

      if (data.status === "2FA_SETUP_COMPLETE") {
        setInfoMessage("2FA activée avec succès! Tentative de connexion...");
        const result = await signIn("credentials", {
          redirect: false,
          email: email(),
        });
        setIsLoading(false);
        if (!result?.ok) {
          setErrorMessage(result?.error || "Erreur de connexion post-setup 2FA. Veuillez réessayer.");
          setStep("ENTER_2FA");
          setPassword("");
          setOtp("");
        }
      } else {
        setIsLoading(false);
        setErrorMessage("Réponse inattendue lors du setup 2FA.");
      }
    } catch (error) {
      setIsLoading(false);
      setErrorMessage("Erreur de communication pour le setup 2FA.");
    }
  };

  const handleLoginWith2FASubmit = async (e: Event) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    const result = await signIn("credentials", {
      redirect: false,
      email: email(),
    });
    setIsLoading(false);
    if (!result?.ok) {
      if (result?.error === "CredentialsSignin") {
        setErrorMessage("Email, mot de passe ou code 2FA invalide.");
      } else {
        setErrorMessage(result?.error || "Erreur de connexion inconnue.");
      }
      setOtp("");
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
    setIsLoading(false);
  };

  return (
    <div class="container mx-auto p-4 max-w-md">
      <Show when={sessionAsync.loading}>
        <p class="text-on-surface">Chargement de la session...</p>
      </Show>

      <Show when={!sessionAsync.loading && sessionAsync()?.user}>
        <div class="space-y-4 text-center">
          <h2 class="text-2xl font-bold text-white">Bienvenue !</h2>
          <p class="text-white">Vous êtes connecté en tant que {sessionAsync()?.user?.email}</p>
          <button onClick={handleSignOut} disabled={isLoading()} class="w-full rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:bg-gray-400">
            {isLoading() ? "Déconnexion..." : "Se déconnecter"}
          </button>
        </div>
      </Show>

      <Show when={!sessionAsync.loading && !sessionAsync()?.user && step() === "INITIAL"}>
        <form onSubmit={handleInitialSubmit} class="space-y-4">
          <h2 class="text-2xl font-bold text-white">Connexion / Inscription</h2>
          <div>
            <label for="email" class="block text-sm font-medium text-white">Email</label>
            <input type="email" id="email" value={email()} onInput={(e) => setEmail(e.currentTarget.value)} required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-black" autocomplete="email" />
          </div>
          <div>
            <label for="password" class="block text-sm font-medium text-white">Mot de passe</label>
            <input type="password" id="password" value={password()} onInput={(e) => setPassword(e.currentTarget.value)} required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-black" autocomplete="current-password" />
          </div>
          <button type="submit" disabled={isLoading()} class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400">
            {isLoading() ? "Chargement..." : "Continuer"}
          </button>
        </form>
      </Show>

      <Show when={!sessionAsync.loading && !sessionAsync()?.user && step() === "SETUP_2FA"}>
        <form onSubmit={handleSetup2FASubmit} class="space-y-4">
          <h2 class="text-2xl font-bold text-white">Configurer l'Authentification à Deux Facteurs</h2>
          <Show when={infoMessage() && !errorMessage()}>
            <p class="mt-4 text-blue-400">{infoMessage()}</p>
          </Show>
          <p class="text-white">Scannez ce QR code avec votre application d'authentification :</p>
          <Show when={qrCodeDataUrl()} fallback={<p class="text-white">Génération du QR code...</p>}>
            <div class="p-4 bg-white inline-block">
              <img src={qrCodeDataUrl()} alt="QR Code pour 2FA" />
            </div>
            <p class="text-sm text-white">Ou entrez cette clé manuellement : <code class="bg-gray-200 text-black p-1 rounded">{
              otpauthUrl() ? new URL(otpauthUrl()).searchParams.get("secret") : ""
            }</code></p>
          </Show>
          <div>
            <label for="otp-setup" class="block text-sm font-medium text-white">Code de Vérification</label>
            <input type="text" id="otp-setup" inputmode="numeric" value={otp()} onInput={(e) => setOtp(e.currentTarget.value)} required pattern="\\d{6}" title="Le code doit être composé de 6 chiffres" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-black" autocomplete="one-time-code" />
          </div>
          <button type="submit" disabled={isLoading()} class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400">
            {isLoading() ? "Vérification..." : "Vérifier et Activer 2FA"}
          </button>
        </form>
      </Show>

      <Show when={!sessionAsync.loading && !sessionAsync()?.user && step() === "ENTER_2FA"}>
        <form onSubmit={handleLoginWith2FASubmit} class="space-y-4">
          <h2 class="text-2xl font-bold text-white">Vérification à Deux Facteurs</h2>
          <Show when={infoMessage() && !errorMessage()}>
            <p class="mt-4 text-blue-400">{infoMessage()}</p>
          </Show>
          <p class="text-white">Entrez le code de votre application d'authentification.</p>
          <div>
            <label for="otp-login" class="block text-sm font-medium text-white">Code 2FA</label>
            <input type="text" id="otp-login" value={otp()} onInput={(e) => setOtp(e.currentTarget.value)} required pattern="\\d{6}" title="Le code doit être composé de 6 chiffres" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-black" autocomplete="one-time-code" />
          </div>
          <button type="submit" disabled={isLoading()} class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400">
            {isLoading() ? "Connexion..." : "Se Connecter"}
          </button>
        </form>
      </Show>

      <Show when={errorMessage()}>
        <p class="mt-4 text-red-400">{errorMessage()}</p>
      </Show>
    </div>
  );
};

export default AuthForm;

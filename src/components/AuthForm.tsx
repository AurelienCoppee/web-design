import { createSignal, Show, VoidComponent } from "solid-js";
import { signIn } from "@auth/solid-start/client";
import { useNavigate } from "@solidjs/router";
import QRCode from "qrcode";

const AuthForm: VoidComponent = () => {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [otp, setOtp] = createSignal("");
  const [step, setStep] = createSignal<"INITIAL" | "SETUP_2FA" | "ENTER_2FA">("INITIAL");
  const [otpauthUrl, setOtpauthUrl] = createSignal("");
  const [errorMessage, setErrorMessage] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(false);

  const navigate = useNavigate();
  const [infoMessage, setInfoMessage] = createSignal("");

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

      if (!response.ok) {
        setErrorMessage(data.error || `Erreur ${response.status}`);
        setIsLoading(false);
        return;
      }

      if (data.status === "SETUP_2FA_REQUIRED") {
        if (data.message) setInfoMessage(data.message);
        setOtpauthUrl(data.otpauthUrl);
        setEmail(data.email);
        setStep("SETUP_2FA");
      } else if (data.status === "2FA_REQUIRED") {
        setEmail(data.email);
        setStep("ENTER_2FA");
      } else if (data.error) {
        setErrorMessage(data.error);
      }
      else {
        setErrorMessage("Réponse inattendue du serveur.");
      }
    } catch (error) {
      console.error("Catch block error:", error);
      setErrorMessage("Erreur de connexion au serveur.");
    }
    setIsLoading(false);
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

        const result = await signIn("credentials", {
          redirect: false,
          email: email(),
          password: password(),
          otp: otp(),
        });
        if (result?.ok) {
          navigate("/");
        } else {
          setErrorMessage(result?.error || "Erreur de connexion post-setup 2FA.");
          setStep("ENTER_2FA");
        }
      } else {
        setErrorMessage("Réponse inattendue lors du setup 2FA.");
      }
    } catch (error) {
      setErrorMessage("Erreur de communication pour le setup 2FA.");
    }
    setIsLoading(false);
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
    if (result?.ok) {
      window.location.href = "/";
    } else {
      if (result?.error === "CredentialsSignin") {
        setErrorMessage("Email, mot de passe ou code 2FA invalide.");
      } else {
        setErrorMessage(result?.error || "Erreur de connexion inconnue.");
      }
    }
  };

  return (
    <div class="container mx-auto p-4 max-w-md">
      <Show when={step() === "INITIAL"}>
        <form onSubmit={handleInitialSubmit} class="space-y-4">
          <h2 class="text-2xl font-bold">Connexion / Inscription</h2>
          <div>
            <label for="email" class="block text-sm font-medium">Email</label>
            <input type="email" id="email" value={email()} onInput={(e) => setEmail(e.currentTarget.value)} required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-black" />
          </div>
          <div>
            <label for="password" class="block text-sm font-medium">Mot de passe</label>
            <input type="password" id="password" value={password()} onInput={(e) => setPassword(e.currentTarget.value)} required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-black" />
          </div>
          <button type="submit" disabled={isLoading()} class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400">
            {isLoading() ? "Chargement..." : "Continuer"}
          </button>
        </form>
      </Show>

      <Show when={step() === "SETUP_2FA"}>
        <form onSubmit={handleSetup2FASubmit} class="space-y-4">
          <h2 class="text-2xl font-bold">Configurer l'Authentification à Deux Facteurs</h2>
          <p>Scannez ce QR code avec votre application d'authentification (Google Authenticator, Authy, etc.) :</p>
          <Show when={otpauthUrl()} fallback={<p>Génération du QR code...</p>}>
            <div class="p-4 bg-white inline-block">
              <QRCode value={otpauthUrl()} size={200} />
            </div>
            <p class="text-sm">Ou entrez cette clé manuellement : <code class="bg-gray-200 text-black p-1 rounded">{new URL(otpauthUrl()).searchParams.get("secret")}</code></p>
          </Show>
          <div>
            <label for="otp-setup" class="block text-sm font-medium">Code de Vérification</label>
            <input type="text" id="otp-setup" value={otp()} onInput={(e) => setOtp(e.currentTarget.value)} required pattern="\d{6}" title="Le code doit être composé de 6 chiffres" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-black" />
          </div>
          <button type="submit" disabled={isLoading()} class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400">
            {isLoading() ? "Vérification..." : "Vérifier et Activer 2FA"}
          </button>
        </form>
      </Show>

      <Show when={step() === "ENTER_2FA"}>
        <form onSubmit={handleLoginWith2FASubmit} class="space-y-4">
          <h2 class="text-2xl font-bold">Vérification à Deux Facteurs</h2>
          <p>Entrez le code de votre application d'authentification.</p>
          <div>
            <label for="otp-login" class="block text-sm font-medium">Code 2FA</label>
            <input type="text" id="otp-login" value={otp()} onInput={(e) => setOtp(e.currentTarget.value)} required pattern="\d{6}" title="Le code doit être composé de 6 chiffres" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-black" />
          </div>
          <button type="submit" disabled={isLoading()} class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400">
            {isLoading() ? "Connexion..." : "Se Connecter"}
          </button>
        </form>
      </Show>

      <Show when={errorMessage()}>
        <p class="mt-4 text-red-500">{errorMessage()}</p>
      </Show>
    </div>
  );
};

export default AuthForm;

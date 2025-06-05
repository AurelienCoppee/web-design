import {
    Component,
    createSignal,
    onMount,
    Show,
    createEffect,
    createMemo,
    lazy,
    Suspense,
    For
} from "solid-js";
import { A, revalidate } from "@solidjs/router";
import { signOut } from "@auth/solid-start/client";
import { createAsync } from "@solidjs/router";
import { getAuthSession } from "~/server/queries/sessionQueries";
import type { Session } from "@auth/core/types";

const LoginSignupModal = lazy(() => import("./modal/LoginSignupModal"));
const TwoFactorAuthModal = lazy(() => import("./modal/TwoFactorAuthModal"));
const CreateOrganizationModal = lazy(() => import("./modal/CreateOrganizationModal"));
const AdminRequestsModal = lazy(() => import("./modal/AdminRequestsModal"));
const ManageOrganizationModal = lazy(() => import("./modal/ManageOrganizationModal"));


const Header: Component = () => {
    const [menuOpen, setMenuOpen] = createSignal(false);
    let buttonRef: HTMLButtonElement | undefined;
    let menuPopupRef: HTMLDivElement | undefined;

    const [isLoginSignupModalOpen, setIsLoginSignupModalOpen] = createSignal(false);
    const [isTwoFactorModalOpen, setIsTwoFactorModalOpen] = createSignal(false);
    const [twoFactorModalMode, setTwoFactorModalMode] = createSignal<"SETUP" | "LOGIN">("SETUP");
    const [tempAuthDetails, setTempAuthDetails] = createSignal<{ email: string; passwordForLogin?: string }>({ email: "" });

    const [isCreateOrganizationModalOpen, setIsCreateOrganizationModalOpen] = createSignal(false);
    const [isAdminRequestsModalOpen, setIsAdminRequestsModalOpen] = createSignal(false);
    const [isManageOrgModalOpen, setIsManageOrgModalOpen] = createSignal(false);
    const [selectedOrgToManage, setSelectedOrgToManage] = createSignal<string | null>(null);


    const sessionResource = createAsync<Session | null, undefined | { loading: true }>(
        () => getAuthSession(),
        {
            deferStream: true,
            initialValue: { loading: true } as any
        }
    );
    const currentUser = createMemo(() => {
        const res = sessionResource();
        if ((res as any)?.loading || sessionResource.loading) return null;
        const user = (res as Session | null)?.user;
        return user;
    });

    const profileImageUrl = createMemo(() => currentUser()?.image);
    const [profileImageError, setProfileImageError] = createSignal(false);
    const [hasAttemptedHydration, setHasAttemptedHydration] = createSignal(false);

    const [isDarkMode, setIsDarkMode] = createSignal(false);
    const [contrastLevel, setContrastLevel] = createSignal<"default" | "mc" | "hc">("default");

    onMount(() => {
        setHasAttemptedHydration(true);
        const handleClickOutside = (e: MouseEvent) => {
            if (menuPopupRef && !menuPopupRef.contains(e.target as Node) && buttonRef && !buttonRef.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        window.addEventListener("click", handleClickOutside);

        const storedTheme = localStorage.getItem("theme");
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setIsDarkMode(storedTheme === "dark" || (!storedTheme && prefersDark));
        const storedContrast = localStorage.getItem("contrast") as ("default" | "mc" | "hc");
        if (storedContrast && ["default", "mc", "hc"].includes(storedContrast)) setContrastLevel(storedContrast);
        return () => window.removeEventListener("click", handleClickOutside);
    });

    createEffect(() => {
        document.documentElement.classList.toggle("dark", isDarkMode());
        localStorage.setItem("theme", isDarkMode() ? "dark" : "light");
    });
    createEffect(() => {
        document.documentElement.classList.remove("mc", "hc");
        if (contrastLevel() === "mc") document.documentElement.classList.add("mc");
        else if (contrastLevel() === "hc") document.documentElement.classList.add("hc");
        localStorage.setItem("contrast", contrastLevel());
    });
    createEffect(() => { setProfileImageError(false); });


    const handleSignOut = async () => {
        await signOut({ redirect: false });
        setMenuOpen(false);
        revalidate(getAuthSession.key);
    };

    const openMainLoginModal = () => {
        setIsLoginSignupModalOpen(true);
        setMenuOpen(false);
    };

    const openActivate2FAFromProfile = () => {
        if (currentUser()?.email) {
            setTempAuthDetails({ email: currentUser()!.email! });
            setTwoFactorModalMode("SETUP");
            setIsTwoFactorModalOpen(true);
            setMenuOpen(false);
        }
    };

    const handlePrompt2FAForSetup = (email: string, passwordFromLogin?: string) => {
        setTempAuthDetails({ email, passwordForLogin: passwordFromLogin });
        setTwoFactorModalMode("SETUP");
        setIsTwoFactorModalOpen(true);
    };

    const handleRequire2FAForLogin = (email: string, validatedPassword?: string) => {
        setTempAuthDetails({ email, passwordForLogin: validatedPassword });
        setTwoFactorModalMode("LOGIN");
        setIsTwoFactorModalOpen(true);
    };

    const handleAuthSuccess = () => {
        setIsLoginSignupModalOpen(false);
        setIsTwoFactorModalOpen(false);
        revalidate(getAuthSession.key);
    };


    const openCreateOrganizationModal = () => {
        setIsCreateOrganizationModalOpen(true);
        setMenuOpen(false);
    };

    const openAdminRequestsModal = () => {
        setIsAdminRequestsModalOpen(true);
        setMenuOpen(false);
    };

    const openManageOrganizationModal = (orgId: string) => {
        setSelectedOrgToManage(orgId);
        setIsManageOrgModalOpen(true);
        setMenuOpen(false);
    };

    const getContrastValue = () => {
        if (contrastLevel() === "mc") return "1";
        if (contrastLevel() === "hc") return "2";
        return "0";
    };
    const showUserSpecificIcon = createMemo(() => !!currentUser());
    const conditionForImageTag = createMemo(() => !!profileImageUrl() && !profileImageError());

    const canRequestOrganization = createMemo(() => {
        const user = currentUser();
        if (!user) return false;
        if (user.provider === "credentials" && !user.isTwoFactorAuthenticated) return false;
        return true;
    });
    const createOrganizationButtonTitle = createMemo(() => {
        if (!currentUser()) return "Veuillez vous connecter.";
        if (currentUser()?.provider === "credentials" && !currentUser()?.isTwoFactorAuthenticated) return "Veuillez vérifier votre session 2FA pour créer une organisation.";
        return "Créer une Organisation";
    });

    return (
        <header class="fixed top-0 left-0 right-0 z-50 text-on-surface bg-surface">
            <div class="flex items-center justify-between h-16 px-4">
                <A href="/" class="text-title-large font-bold tracking-tight text-on-surface no-underline">RALVO</A>
                <div class="relative ml-auto">
                    <button
                        ref={buttonRef}
                        aria-haspopup="true"
                        aria-expanded={menuOpen()}
                        class="p-1 rounded-mat-corner-full hover:bg-surface-variant transition flex items-center justify-center"
                        style={{ width: "40px", height: "40px" }}
                        onClick={() => setMenuOpen(!menuOpen())}
                    >
                        <Show
                            when={showUserSpecificIcon() && hasAttemptedHydration()}
                            fallback={
                                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true">
                                    <path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z" />
                                </svg>
                            }
                        >
                            <Show
                                when={conditionForImageTag()}
                                fallback={
                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true">
                                        <path d="M234-276q51-39 114-61.5T480-360q69 0 132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 59 19.5 111t54.5 93Zm246-164q-59 0-99.5-40.5T340-580q0-59 40.5-99.5T480-720q59 0 99.5 40.5T620-580q0 59-40.5 99.5T480-440Zm0 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q53 0 100-15.5t86-44.5q-39-29-86-44.5T480-280q-53 0-100 15.5T294-220q39 29 86 44.5T480-160Zm0-360q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm0-60Zm0 360Z" />
                                    </svg>
                                }
                            >
                                <img
                                    src={profileImageUrl()!}
                                    alt="Photo de profil"
                                    class="rounded-mat-corner-full w-8 h-8 object-cover"
                                    onError={() => { if (hasAttemptedHydration()) setProfileImageError(true); }}
                                />
                            </Show>
                        </Show>
                    </button>
                    <Show when={menuOpen()}>
                        <div
                            ref={menuPopupRef}
                            class="absolute right-0 mt-2 w-72 bg-surface-container shadow-mat-level2 rounded-mat-corner-medium z-[70] animate-fade-in p-2"
                        >
                            <ul class="text-on-surface-variant space-y-1">
                                <Show
                                    when={showUserSpecificIcon() && hasAttemptedHydration()}
                                    fallback={
                                        <li>
                                            <button onClick={openMainLoginModal} class="w-full text-left block px-3 py-2 hover:bg-surface-container-high text-on-surface-variant rounded-mat-corner-small font-label-large">Connexion / Inscription</button>
                                        </li>
                                    }
                                >
                                    <li class="px-3 py-2 text-label-medium text-on-surface-variant/70">
                                        Connecté: {currentUser()?.email}
                                    </li>

                                    <Show when={currentUser()?.provider === 'credentials' && !currentUser()?.twoFactorEnabled}>
                                        <li>
                                            <button onClick={openActivate2FAFromProfile} class="w-full text-left block px-3 py-2 hover:bg-surface-container-high text-on-surface-variant rounded-mat-corner-small font-label-large">Activer 2FA</button>
                                        </li>
                                    </Show>

                                    <Show when={currentUser()?.role !== 'ADMIN'}>
                                        <li>
                                            <button
                                                onClick={openCreateOrganizationModal}
                                                disabled={!canRequestOrganization()}
                                                class="w-full text-left block px-3 py-2 hover:bg-surface-container-high text-on-surface-variant rounded-mat-corner-small font-label-large disabled:opacity-50 disabled:cursor-not-allowed"
                                                title={createOrganizationButtonTitle()}
                                            >
                                                Créer une Organisation
                                            </button>
                                        </li>
                                    </Show>

                                    <Show when={currentUser()?.role === 'ADMIN'}>
                                        <li>
                                            <button
                                                onClick={openAdminRequestsModal}
                                                class="w-full text-left block px-3 py-2 hover:bg-surface-container-high text-on-surface-variant rounded-mat-corner-small font-label-large"
                                            >
                                                Gérer les demandes d'organisation
                                            </button>
                                        </li>
                                    </Show>

                                    <Show when={currentUser()?.administeredOrganizations && currentUser()!.administeredOrganizations!.length > 0}>
                                        <hr class="border-outline-variant my-1" />
                                        <li class="px-3 py-2 text-label-medium text-on-surface-variant/70">Mes Organisations (Admin):</li>
                                        <For each={currentUser()!.administeredOrganizations!}>
                                            {(org) => (
                                                <li>
                                                    <button
                                                        onClick={() => openManageOrganizationModal(org.id)}
                                                        class="w-full text-left block px-3 py-2 hover:bg-surface-container-high text-on-surface-variant rounded-mat-corner-small font-label-large"
                                                    >
                                                        Gérer "{org.name}"
                                                    </button>
                                                </li>
                                            )}
                                        </For>
                                    </Show>
                                    <hr class="border-outline-variant my-1" />
                                    <li>
                                        <button onClick={handleSignOut} class="w-full text-left block px-3 py-2 hover:bg-surface-container-high text-on-surface-variant rounded-mat-corner-small font-label-large">Se déconnecter</button>
                                    </li>
                                </Show>
                                <hr class="border-outline-variant my-1" />
                                <li class="flex items-center justify-between px-3 py-2">
                                    <span class="font-label-large">Thème Sombre</span>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={isDarkMode()} onChange={() => setIsDarkMode(!isDarkMode())} class="sr-only peer" />
                                        <div class="w-11 h-6 bg-surface-variant peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-mat-corner-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-on-surface after:border-gray-300 after:border after:rounded-mat-corner-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </li>
                                <li class="px-3 py-2">
                                    <label for="contrast-slider" class="block font-label-large mb-1">Contraste</label>
                                    <input
                                        type="range"
                                        id="contrast-slider"
                                        min="0"
                                        max="2"
                                        step="1"
                                        value={getContrastValue()}
                                        onInput={(e) => {
                                            const val = (e.target as HTMLInputElement).value;
                                            if (val === "0") setContrastLevel("default");
                                            else if (val === "1") setContrastLevel("mc");
                                            else if (val === "2") setContrastLevel("hc");
                                        }}
                                        class="w-full h-2 bg-surface-variant rounded-mat-corner-full appearance-none cursor-pointer accent-primary"
                                    />
                                    <div class="flex justify-between text-label-small text-on-surface-variant/70 mt-1">
                                        <span>Normal</span>
                                        <span>Moyen</span>
                                        <span>Haut</span>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </Show>
                </div>
            </div>

            <Suspense fallback={<div class="fixed z-[70] bottom-4 right-4 p-2 bg-surface-container-high text-on-surface-variant rounded-mat-corner-medium shadow-mat-level2">Chargement...</div>}>
                <LoginSignupModal
                    isOpen={isLoginSignupModalOpen}
                    setIsOpen={setIsLoginSignupModalOpen}
                    onSuccess={handleAuthSuccess}
                    onPrompt2FA={handlePrompt2FAForSetup}
                    onRequire2FA={handleRequire2FAForLogin}
                />
            </Suspense>
            <Suspense fallback={<div class="fixed z-[70] bottom-4 right-4 p-2 bg-surface-container-high text-on-surface-variant rounded-mat-corner-medium shadow-mat-level2">Chargement...</div>}>
                <TwoFactorAuthModal
                    isOpen={isTwoFactorModalOpen}
                    setIsOpen={setIsTwoFactorModalOpen}
                    onSuccess={handleAuthSuccess}
                    mode={twoFactorModalMode}
                    email={() => tempAuthDetails().email}
                    passwordForLogin={() => tempAuthDetails().passwordForLogin}
                />
            </Suspense>
            <Suspense fallback={<div class="fixed z-[70] bottom-4 right-4 p-2 bg-surface-container-high text-on-surface-variant rounded-mat-corner-medium shadow-mat-level2">Chargement...</div>}>
                <CreateOrganizationModal
                    isOpen={isCreateOrganizationModalOpen}
                    setIsOpen={setIsCreateOrganizationModalOpen}
                    onSuccess={() => { }}
                />
            </Suspense>
            <Suspense fallback={<div class="fixed z-[70] bottom-4 right-4 p-2 bg-surface-container-high text-on-surface-variant rounded-mat-corner-medium shadow-mat-level2">Chargement...</div>}>
                <AdminRequestsModal
                    isOpen={isAdminRequestsModalOpen}
                    setIsOpen={setIsAdminRequestsModalOpen}
                />
            </Suspense>
            <Suspense fallback={<div class="fixed z-[70] bottom-4 right-4 p-2 bg-surface-container-high text-on-surface-variant rounded-mat-corner-medium shadow-mat-level2">Chargement...</div>}>
                <Show when={selectedOrgToManage()}>
                    {(orgId) => (
                        <ManageOrganizationModal
                            isOpen={isManageOrgModalOpen}
                            setIsOpen={setIsManageOrgModalOpen}
                            organizationId={orgId()}
                        />
                    )}
                </Show>
            </Suspense>
        </header>
    );
};

export default Header;

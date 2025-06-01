import { Component, createSignal, onMount, Show, createEffect } from "solid-js";
import AuthModal from "./AuthModal";
import { signOut } from "@auth/solid-start/client";
import { getRequestEvent } from "solid-js/web";
import { getSession as getServerSession } from "@auth/solid-start";
import { authOptions } from "~/server/auth";
import { createAsync, query } from "@solidjs/router";

const getAuthSessionQueryHeader = query(
    async () => {
        "use server";
        const event = getRequestEvent();
        if (!event) {
            console.error("No request event found on server for getAuthSessionQueryHeader");
            return null;
        }
        try {
            return await getServerSession(event.request, authOptions);
        } catch (e) {
            console.error("Error fetching session in getAuthSessionQueryHeader:", e);
            return null;
        }
    },
    "authSessionHeader"
);

const Header: Component = () => {
    const [open, setOpen] = createSignal(false);
    let buttonRef: HTMLButtonElement | undefined;
    let menuRef: HTMLDivElement | undefined;
    const [isAuthModalOpen, setIsAuthModalOpen] = createSignal(false);
    const [isDarkMode, setIsDarkMode] = createSignal(false);
    const [contrastLevel, setContrastLevel] = createSignal<"default" | "mc" | "hc">("default");

    const sessionAsync = createAsync(() => getAuthSessionQueryHeader());

    onMount(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                menuRef &&
                !menuRef.contains(e.target as Node) &&
                buttonRef &&
                !buttonRef.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        window.addEventListener("click", handleClickOutside);
        return () => window.removeEventListener("click", handleClickOutside);
    });

    onMount(() => {
        const storedTheme = localStorage.getItem("theme");
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (storedTheme === "dark" || (!storedTheme && prefersDark)) {
            setIsDarkMode(true);
        } else {
            setIsDarkMode(false);
        }

        const storedContrast = localStorage.getItem("contrast") as typeof contrastLevel.initialValue;
        if (storedContrast && ["default", "mc", "hc"].includes(storedContrast)) {
            setContrastLevel(storedContrast);
        }
    });

    createEffect(() => {
        if (isDarkMode()) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    });

    createEffect(() => {
        document.documentElement.classList.remove("mc", "hc");
        if (contrastLevel() === "mc") {
            document.documentElement.classList.add("mc");
        } else if (contrastLevel() === "hc") {
            document.documentElement.classList.add("hc");
        }
        localStorage.setItem("contrast", contrastLevel());
    });

    const handleThemeToggle = () => {
        setIsDarkMode(!isDarkMode());
    };

    const handleContrastChange = (event: Event) => {
        const value = (event.target as HTMLInputElement).value;
        if (value === "0") setContrastLevel("default");
        else if (value === "1") setContrastLevel("mc");
        else if (value === "2") setContrastLevel("hc");
    };

    const handleSignOut = async () => {
        await signOut({ redirect: false });
        setIsAuthModalOpen(false);
        setOpen(false);
        getAuthSessionQueryHeader.refetch();
    };

    const openLoginModal = () => {
        setIsAuthModalOpen(true);
        setOpen(false);
    };

    const getContrastValue = () => {
        if (contrastLevel() === "mc") return "1";
        if (contrastLevel() === "hc") return "2";
        return "0";
    };

    return (
        <header class="fixed top-0 left-0 right-0 z-50 text-on-surface">
            <div class="flex items-center justify-between h-16 px-4">
                <h1 class="text-2xl font-bold tracking-tight">RALVO</h1>

                <div class="relative ml-auto">
                    <button
                        ref={el => (buttonRef = el)}
                        aria-haspopup="true"
                        aria-expanded={open()}
                        class="p-1 rounded-full hover:bg-surface-variant transition flex items-center justify-center"
                        style={{ width: "40px", height: "40px" }}
                        onClick={() => setOpen(!open())}
                    >
                        <Show
                            when={!sessionAsync.loading && sessionAsync()?.user?.image}
                            fallback={
                                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"> {/* Use currentColor */}
                                    <path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm0-80Zm0 400Z" />
                                </svg>
                            }
                        >
                            <img
                                src={sessionAsync()?.user?.image!}
                                alt="Profile picture"
                                class="rounded-full w-8 h-8 object-cover"
                            />
                        </Show>
                    </button>

                    {open() && (
                        <div
                            ref={el => (menuRef = el)}
                            class="absolute right-0 mt-2 w-64 bg-surface-container shadow-mat-level2 rounded-lg z-[70] animate-fade-in p-2"
                        >
                            <ul class="text-on-surface-variant space-y-1">
                                <Show
                                    when={!sessionAsync.loading && sessionAsync()?.user}
                                    fallback={
                                        <li>
                                            <button onClick={openLoginModal} class="w-full text-left block px-3 py-2 hover:bg-surface-variant hover:text-on-surface-variant rounded-md">Connexion</button>
                                        </li>
                                    }
                                >
                                    <li class="px-3 py-2 text-sm text-on-surface-variant/70">
                                        Connecté en tant que {sessionAsync()?.user?.email}
                                    </li>
                                    <li>
                                        <button onClick={handleSignOut} class="w-full text-left block px-3 py-2 hover:bg-surface-variant hover:text-on-surface-variant rounded-md">Se déconnecter</button>
                                    </li>
                                </Show>
                                <hr class="border-outline-variant my-1" />
                                <li class="flex items-center justify-between px-3 py-2">
                                    <span>Thème Sombre</span>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={isDarkMode()} onChange={handleThemeToggle} class="sr-only peer" />
                                        <div class="w-11 h-6 bg-surface-variant peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-on-surface after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </li>
                                <li class="px-3 py-2">
                                    <label for="contrast-slider" class="block text-sm mb-1">Contraste</label>
                                    <input
                                        type="range"
                                        id="contrast-slider"
                                        min="0"
                                        max="2"
                                        step="1"
                                        value={getContrastValue()}
                                        onInput={handleContrastChange}
                                        class="w-full h-2 bg-surface-variant rounded-lg appearance-none cursor-pointer accent-primary" // accent-primary for the thumb
                                    />
                                    <div class="flex justify-between text-xs text-on-surface-variant/70 mt-1">
                                        <span>Normal</span>
                                        <span>Moyen</span>
                                        <span>Haut</span>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>
            <AuthModal isOpen={isAuthModalOpen} setIsOpen={setIsAuthModalOpen} />
        </header>
    );
};

export default Header;

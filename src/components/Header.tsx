import { Component, createSignal, onMount } from "solid-js";

const Header: Component = () => {
    const [open, setOpen] = createSignal(false);
    let buttonRef: HTMLButtonElement | undefined;
    let menuRef: HTMLDivElement | undefined;

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

    return (
        <header class="fixed top-0 left-0 right-0 z-50 text-on-surface">
            <div class="flex items-center justify-between h-16 px-4">
                <h1 class="text-2xl font-bold tracking-tight">RALVO</h1>

                <div class="relative">
                    <button
                        ref={el => (buttonRef = el)}
                        aria-haspopup="true"
                        aria-expanded={open()}
                        class="p-2 rounded-full hover:bg-surface-variant transition"
                        onClick={() => setOpen(!open())}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
                            <path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm0-80Zm0 400Z" />
                        </svg>
                    </button>

                    {open() && (
                        <div
                            ref={el => (menuRef = el)}
                            class="absolute right-0 mt-2 bg-surface-variant shadow-md rounded-lg z-50 animate-fade-in p-4"
                        >
                            <ul class="text-on-surface-variant">
                                <li>
                                    <a href="#" class="block px-4 py-2 hover:bg-on-surface-variant hover:text-surface-variant rounded-lg">Connexion</a>
                                </li>
                                <li>
                                    <a href="#" class="block px-4 py-2 hover:bg-on-surface-variant hover:text-surface-variant rounded-md">Theme</a>
                                </li>
                                <li>
                                    <a href="#" class="block px-4 py-2 hover:bg-on-surface-variant hover:text-surface-variant rounded-md">Contraste</a>
                                </li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;

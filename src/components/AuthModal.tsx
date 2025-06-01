import { Show, type VoidComponent, createSignal, Setter, Accessor } from "solid-js";
import AuthForm from "./AuthForm";

interface AuthModalProps {
    isOpen: Accessor<boolean>;
    setIsOpen: Setter<boolean>;
}

const AuthModal: VoidComponent<AuthModalProps> = (props) => {
    const handleClose = () => {
        props.setIsOpen(false);
    };

    return (
        <Show when={props.isOpen()}>
            <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
                <div class="bg-surface-container p-6 rounded-lg shadow-mat-level3 w-full max-w-md m-4 relative">
                    <button
                        onClick={handleClose}
                        class="absolute top-2 right-2 p-2 rounded-full hover:bg-surface-variant text-on-surface-variant"
                        aria-label="Close login dialog"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
                            <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                        </svg>
                    </button>
                    <AuthForm onSuccess={handleClose} />
                </div>
            </div>
        </Show>
    );
};

export default AuthModal;

import { Show, type VoidComponent, Setter, Accessor, createSignal } from "solid-js";

interface BecomeOrganizerModalProps {
    isOpen: Accessor<boolean>;
    setIsOpen: Setter<boolean>;
}

const BecomeOrganizerForm: VoidComponent<{ onSuccess: () => void }> = (props) => {
    const [formData, setFormData] = createSignal({ details: "" });
    const [message, setMessage] = createSignal("");
    const [error, setError] = createSignal("");
    const [isLoading, setIsLoading] = createSignal(false);

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage("");
        setError("");
        try {
            const response = await fetch("/api/user/request-organizer-role", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData()),
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || "Erreur lors de la soumission.");
            } else {
                setMessage(data.message || "Demande envoyée !");
                setTimeout(() => props.onSuccess(), 2000);
            }
        } catch (err) {
            setError("Erreur de communication.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} class="space-y-4">
            <h3 class="text-xl font-semibold text-on-surface">Devenir Organisateur</h3>
            <p class="text-sm text-on-surface-variant">
                Veuillez fournir quelques informations supplémentaires.
            </p>
            <div>
                <label for="organizer-details" class="block text-sm font-medium text-on-surface-variant">
                    Détails (ex: type d'événements, motivation)
                </label>
                <textarea
                    id="organizer-details"
                    rows="4"
                    class="mt-1 block w-full rounded-md border-outline bg-surface text-on-surface shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                    value={formData().details}
                    onInput={(e) => setFormData({ ...formData(), details: e.currentTarget.value })}
                    required
                />
            </div>
            <Show when={message()}><p class="text-green-500">{message()}</p></Show>
            <Show when={error()}><p class="text-error">{error()}</p></Show>
            <button type="submit" disabled={isLoading()} class="w-full rounded-md bg-primary px-4 py-2 text-on-primary hover:brightness-110 disabled:opacity-50">
                {isLoading() ? "Envoi..." : "Soumettre la demande"}
            </button>
        </form>
    );
};


const BecomeOrganizerModal: VoidComponent<BecomeOrganizerModalProps> = (props) => {
    const handleClose = () => {
        props.setIsOpen(false);
    };

    return (
        <Show when={props.isOpen()}>
            <div class="fixed inset-0 z-[60] flex items-center justify-center bg-scrim/50">
                <div class="bg-surface-container p-6 rounded-lg shadow-mat-level3 w-full max-w-lg m-4 relative">
                    <button
                        onClick={handleClose}
                        class="absolute top-2 right-2 p-2 rounded-full hover:bg-surface-variant text-on-surface-variant"
                        aria-label="Fermer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" /></svg>
                    </button>
                    <BecomeOrganizerForm onSuccess={handleClose} />
                </div>
            </div>
        </Show>
    );
};

export default BecomeOrganizerModal;

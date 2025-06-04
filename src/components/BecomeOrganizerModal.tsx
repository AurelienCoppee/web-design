import { Show, type VoidComponent, Setter, Accessor, createSignal, createEffect } from "solid-js";
import { requestOrganizerRoleAction } from "~/server/actions/userActions";
import { useSubmission } from "@solidjs/router";

interface BecomeOrganizerModalProps {
    isOpen: Accessor<boolean>;
    setIsOpen: Setter<boolean>;
    onSuccess?: () => void;
}

const BecomeOrganizerForm: VoidComponent<{ onSuccess: () => void, closeModal: () => void }> = (props) => {
    const [details, setDetails] = createSignal("");
    const submission = useSubmission(requestOrganizerRoleAction);

    createEffect(() => {
        if (submission.result?.success && !submission.pending && !submission.error) {
            setTimeout(() => {
                props.onSuccess?.();
                props.closeModal();
            }, 2000);
        }
    });

    return (
        <form action={requestOrganizerRoleAction} method="post" class="space-y-4">
            <h3 class="text-xl font-semibold text-on-surface">Devenir Organisateur</h3>
            <p class="text-sm text-on-surface-variant">
                Veuillez fournir quelques informations supplémentaires si vous le souhaitez (optionnel).
            </p>
            <div>
                <label for="organizer-details" class="block text-sm font-medium text-on-surface-variant">
                    Détails (ex: type d'événements, motivation)
                </label>
                <textarea
                    id="organizer-details"
                    name="details"
                    rows="4"
                    class="mt-1 block w-full rounded-md border-outline bg-surface text-on-surface shadow-sm focus:border-primary"
                    value={details()}
                    onInput={(e) => setDetails(e.currentTarget.value)}
                />
            </div>
            <Show when={submission.result?.success && !submission.error}>
                <p class="text-green-500">{submission.result.message}</p>
            </Show>

            <Show when={submission.error}>
                {(error) => (
                    <div class="my-2 p-3 bg-error-container text-on-error-container rounded-md">
                        <p class="text-sm">
                            {typeof error().error === 'string' ? error().error : (error().error?.message || "Erreur lors de la soumission.")}
                        </p>
                        <div class="mt-3 flex gap-2">
                            <button
                                type="button"
                                onClick={() => submission.retry()}
                                class="px-3 py-1 text-sm bg-primary/80 text-on-primary rounded-md hover:bg-primary"
                            >
                                Réessayer
                            </button>
                            <button
                                type="button"
                                onClick={() => { submission.clear(); }}
                                class="px-3 py-1 text-sm bg-surface-variant text-on-surface-variant rounded-md hover:brightness-95"
                            >
                                Effacer
                            </button>
                        </div>
                    </div>
                )}
            </Show>

            <button type="submit" disabled={submission.pending} class="w-full rounded-md bg-primary px-4 py-2 text-on-primary hover:brightness-110 disabled:opacity-50">
                {submission.pending ? "Envoi..." : "Soumettre la demande"}
            </button>
        </form>
    );
};

const BecomeOrganizerModal: VoidComponent<BecomeOrganizerModalProps> = (props) => {
    const handleClose = () => {
        props.setIsOpen(false);
    };

    const handleSuccess = () => {
        props.onSuccess?.();
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
                    <BecomeOrganizerForm onSuccess={handleSuccess} closeModal={handleClose} />
                </div>
            </div>
        </Show>
    );
};

export default BecomeOrganizerModal;

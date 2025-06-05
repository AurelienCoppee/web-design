// src/components/modal/CreateOrganizationModal.tsx
import { Show, type VoidComponent, Setter, Accessor, createSignal, createEffect } from "solid-js";
import { submitOrganizationCreationRequestAction } from "~/server/actions/organizationActions"; // Updated action
import { useSubmission } from "@solidjs/router";

interface CreateOrganizationModalProps {
    isOpen: Accessor<boolean>;
    setIsOpen: Setter<boolean>;
    onSuccess?: () => void;
}

const CreateOrganizationForm: VoidComponent<{ onSuccess?: () => void, closeModal: () => void }> = (props) => {
    const [name, setName] = createSignal("");
    const [memberCount, setMemberCount] = createSignal(1);
    const [pastEventsLinks, setPastEventsLinks] = createSignal("");
    const [legalStatus, setLegalStatus] = createSignal("");

    const submission = useSubmission(submitOrganizationCreationRequestAction);

    createEffect(() => {
        if (submission.result?.success && !submission.pending && !submission.error) {
            setTimeout(() => {
                props.onSuccess?.();
                props.closeModal();
            }, 2000);
        }
    });

    return (
        <form action={submitOrganizationCreationRequestAction} method="post" class="space-y-4">
            <h3 class="text-xl font-semibold text-on-surface">Demande de Création d'Organisation</h3>
            <div>
                <label for="org-name" class="block text-sm font-medium text-on-surface-variant">
                    Nom de l'organisation *
                </label>
                <input
                    type="text" id="org-name" name="name" required
                    class="mt-1 block w-full rounded-md border-outline bg-surface text-on-surface shadow-sm focus:border-primary"
                    value={name()} onInput={(e) => setName(e.currentTarget.value)}
                />
            </div>
            <div>
                <label for="org-member-count" class="block text-sm font-medium text-on-surface-variant">
                    Nombre de membres estimé *
                </label>
                <input
                    type="number" id="org-member-count" name="memberCount" required min="1"
                    class="mt-1 block w-full rounded-md border-outline bg-surface text-on-surface shadow-sm focus:border-primary"
                    value={memberCount()} onInput={(e) => setMemberCount(parseInt(e.currentTarget.value) || 1)}
                />
            </div>
            <div>
                <label for="org-past-events" class="block text-sm font-medium text-on-surface-variant">
                    Liens vers des événements passés (si applicable, un lien par ligne)
                </label>
                <textarea
                    id="org-past-events" name="pastEventsLinks" rows="3"
                    class="mt-1 block w-full rounded-md border-outline bg-surface text-on-surface shadow-sm focus:border-primary"
                    value={pastEventsLinks()} onInput={(e) => setPastEventsLinks(e.currentTarget.value)}
                />
            </div>
            <div>
                <label for="org-legal-status" class="block text-sm font-medium text-on-surface-variant">
                    Statut légal (ex: ASBL, collectif, entreprise, etc.)
                </label>
                <input
                    type="text" id="org-legal-status" name="legalStatus"
                    class="mt-1 block w-full rounded-md border-outline bg-surface text-on-surface shadow-sm focus:border-primary"
                    value={legalStatus()} onInput={(e) => setLegalStatus(e.currentTarget.value)}
                />
            </div>

            <Show when={submission.result?.success && !submission.error}>
                <p class="text-green-500">{submission.result.message}</p>
            </Show>
            <Show when={submission.error}>
                {(error) => (
                    <div class="my-2 p-3 bg-error-container text-on-error-container rounded-md">
                        <p class="text-sm whitespace-pre-wrap">
                            {typeof error().error === 'string' ? error().error : (error().error?.message || "Erreur lors de la soumission.")}
                            <Show when={error().details && typeof error().details === 'object'}>
                                <ul class="mt-1 list-disc list-inside text-xs">
                                    {Object.entries(error().details as Record<string, { _errors: string[] }>).map(([field, fieldErrors]) => (
                                        <Show when={fieldErrors?._errors?.length > 0}>
                                            <li>{field}: {fieldErrors._errors.join(", ")}</li>
                                        </Show>
                                    ))}
                                </ul>
                            </Show>
                        </p>
                        {/* ... retry/clear buttons ... */}
                    </div>
                )}
            </Show>

            <button type="submit" disabled={submission.pending} class="w-full rounded-md bg-primary px-4 py-2 text-on-primary hover:brightness-110 disabled:opacity-50">
                {submission.pending ? "Envoi..." : "Soumettre la demande"}
            </button>
        </form>
    );
};

const CreateOrganizationModal: VoidComponent<CreateOrganizationModalProps> = (props) => {
    const handleClose = () => { props.setIsOpen(false); };
    const handleSuccess = () => { props.onSuccess?.(); };

    return (
        <Show when={props.isOpen()}>
            <div class="fixed inset-0 z-[60] flex items-center justify-center bg-scrim/50">
                <div class="bg-surface-container p-6 rounded-lg shadow-mat-level3 w-full max-w-lg m-4 relative">
                    <button onClick={handleClose} /* ... close button svg ... */ >
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" /></svg>
                    </button>
                    <CreateOrganizationForm onSuccess={handleSuccess} closeModal={handleClose} />
                </div>
            </div>
        </Show>
    );
};

export default CreateOrganizationModal;

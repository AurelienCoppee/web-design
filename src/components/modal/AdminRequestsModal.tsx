import { Show, For, type VoidComponent, Setter, Accessor, createEffect } from "solid-js";
import { createAsync, useSubmission, revalidate } from "@solidjs/router";
import { getPendingOrganizationRequests, type OrganizationRequestWithUser } from "~/server/queries/organizationQueries";
import { approveOrganizationRequestAction, rejectOrganizationRequestAction } from "~/server/actions/organizationActions";

interface AdminRequestsModalProps {
    isOpen: Accessor<boolean>;
    setIsOpen: Setter<boolean>;
}

const AdminRequestsModal: VoidComponent<AdminRequestsModalProps> = (props) => {
    const pendingRequests = createAsync(() => getPendingOrganizationRequests(), {
        deferStream: true,
    });

    const approveSubmission = useSubmission(approveOrganizationRequestAction);
    const rejectSubmission = useSubmission(rejectOrganizationRequestAction);

    createEffect(() => {
        if (props.isOpen()) {
            revalidate(getPendingOrganizationRequests.key);
        }
    });

    const handleApprove = async (requestId: string) => {
        const formData = new FormData();
        formData.append("requestId", requestId);
        await approveOrganizationRequestAction(formData);
    };

    const handleReject = async (requestId: string) => {
        const formData = new FormData();
        formData.append("requestId", requestId);
        await rejectOrganizationRequestAction(formData);
    };

    const handleClose = () => {
        if (approveSubmission.pending || rejectSubmission.pending) return;
        props.setIsOpen(false);
    };

    return (
        <Show when={props.isOpen()}>
            <div class="fixed inset-0 z-[70] flex items-center justify-center bg-scrim/50 p-4">
                <div class="bg-surface-container p-6 rounded-mat-corner-extra-large shadow-mat-level3 w-full max-w-2xl m-4 relative max-h-[90vh] overflow-y-auto">
                    <button
                        onClick={handleClose}
                        class="absolute top-4 right-4 p-2 rounded-mat-corner-full hover:bg-surface-container-high text-on-surface-variant disabled:opacity-50"
                        aria-label="Fermer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" /></svg>
                    </button>
                    <h2 class="text-headline-small text-on-surface mb-6">Demandes de Création d'Organisation en Attente</h2>
                    <Show when={pendingRequests.loading}>
                        <p class="text-body-medium text-on-surface-variant">Chargement des demandes...</p>
                    </Show>
                    <Show when={!pendingRequests.loading && pendingRequests()?.length === 0}>
                        <p class="text-body-medium text-on-surface-variant">Aucune demande en attente.</p>
                    </Show>
                    <ul class="space-y-4">
                        <For each={pendingRequests()}>
                            {(request: OrganizationRequestWithUser) => (
                                <li class="p-4 border border-outline-variant rounded-mat-corner-medium bg-surface-container-low">
                                    <h3 class="text-title-medium font-semibold text-on-surface-variant">{request.name}</h3>
                                    <p class="text-body-small">Demandé par: {request.user.name || request.user.email}</p>
                                    <p class="text-body-small">Membres: {request.memberCount}</p>
                                    <p class="text-body-small">Statut légal: {request.legalStatus || 'N/A'}</p>
                                    <p class="text-body-small">Événements passés: {request.pastEventsLinks || 'N/A'}</p>
                                    <div class="mt-3 space-x-2">
                                        <button
                                            onClick={() => handleApprove(request.id)}
                                            disabled={approveSubmission.pending || rejectSubmission.pending}
                                            class="px-4 py-2 text-sm bg-primary text-on-primary rounded-mat-corner-full hover:brightness-110 disabled:opacity-50 font-label-large"
                                        >
                                            Approuver
                                        </button>
                                        <button
                                            onClick={() => handleReject(request.id)}
                                            disabled={approveSubmission.pending || rejectSubmission.pending}
                                            class="px-4 py-2 text-sm bg-error text-on-error rounded-mat-corner-full hover:brightness-110 disabled:opacity-50 font-label-large"
                                        >
                                            Rejeter
                                        </button>
                                    </div>
                                    <Show when={approveSubmission.pending && approveSubmission.input?.get("requestId") === request.id}>
                                        <p class="text-label-small text-primary animate-pulse">Approbation...</p>
                                    </Show>
                                    <Show when={rejectSubmission.pending && rejectSubmission.input?.get("requestId") === request.id}>
                                        <p class="text-label-small text-error animate-pulse">Rejet...</p>
                                    </Show>
                                </li>
                            )}
                        </For>
                    </ul>
                </div>
            </div>
        </Show>
    );
};
export default AdminRequestsModal;

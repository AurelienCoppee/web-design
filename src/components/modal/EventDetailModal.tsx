import { Show, type VoidComponent, Setter, Accessor, For, createResource, createMemo } from "solid-js";
import { createAsync } from "@solidjs/router";
import { getAuthSession } from "~/server/queries/sessionQueries";
import {
    getInterestedCoMembersForEvent,
    getEventInterestCountForUser,
    type InterestedUserForEvent
} from "~/server/queries/userEventInterestQueries";
import type { EventWithDetails } from "~/server/queries/eventQueries";


interface EventDetailModalProps {
    isOpen: Accessor<boolean>;
    setIsOpen: Setter<boolean>;
    event: Accessor<EventWithDetails | null>;
}

const EventDetailModal: VoidComponent<EventDetailModalProps> = (props) => {
    const sessionData = createAsync(() => getAuthSession());

    const [interestCount] = createResource(
        () => props.event()?.id,
        (eventId) => eventId ? getEventInterestCountForUser(eventId) : Promise.resolve(0)
    );

    const [interestedCoMembers] = createResource(
        () => ({ eventId: props.event()?.id, userId: sessionData()?.user?.id }),
        (params) => {
            if (!params.eventId || !params.userId) return Promise.resolve([]);
            return getInterestedCoMembersForEvent(params.eventId, params.userId);
        }
    );

    const isCurrentUserAdminOfEventOrg = createMemo(() => {
        const eventOrgId = props.event()?.organizationId;
        const userMemberships = sessionData()?.user?.organizationMemberships;
        if (!eventOrgId || !userMemberships) return false;

        return userMemberships.some(
            (m: any) => m.organization.id === eventOrgId && m.role === 'ADMIN'
        );
    });

    const handleClose = () => {
        props.setIsOpen(false);
    };

    const formatDate = (dateString: string | Date) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <Show when={props.isOpen() && props.event()}>
            {(currentEvent) => (
                <div class="fixed inset-0 z-[70] flex items-center justify-center bg-scrim/50 p-4">
                    <div class="bg-surface-container p-6 rounded-mat-corner-extra-large shadow-mat-level3 w-full max-w-xl m-4 relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={handleClose}
                            class="absolute top-4 right-4 p-2 rounded-mat-corner-full hover:bg-surface-container-high text-on-surface-variant"
                            aria-label="Close event details"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
                                <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                            </svg>
                        </button>
                        <h2 class="text-headline-medium text-on-surface mb-2">{currentEvent.title}</h2>
                        <p class="text-body-small text-on-surface-variant mb-4">
                            Organisé par : {currentEvent.organization?.name || 'N/A'}
                        </p>

                        <div class="space-y-3 text-body-medium text-on-surface-variant">
                            <p><strong class="text-on-surface font-medium">Date:</strong> {formatDate(currentEvent.date)}</p>
                            <p><strong class="text-on-surface font-medium">Adresse:</strong> {currentEvent.address}, {currentEvent.city}, {currentEvent.region}</p>
                            <div>
                                <strong class="text-on-surface font-medium">Description:</strong>
                                <p class="mt-1 whitespace-pre-wrap text-body-medium">{currentEvent.description}</p>
                            </div>
                            <p><strong class="text-on-surface font-medium">Coordonnées:</strong> Lat: {currentEvent.lat}, Lng: {currentEvent.lng}</p>
                        </div>
                        <Show when={currentEvent.lat && currentEvent.lng}>
                            <div class="mt-4">
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${currentEvent.lat},${currentEvent.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="inline-flex items-center px-6 py-2.5 border border-transparent text-on-primary bg-primary hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-focus rounded-mat-corner-full font-label-large"
                                >
                                    Voir sur la carte
                                    <svg class="ml-2 -mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                                    </svg>
                                </a>
                            </div>
                        </Show>

                        <Show when={isCurrentUserAdminOfEventOrg()}>
                            <div class="mt-4 pt-4 border-t border-outline-variant">
                                <p class="text-body-medium text-on-surface-variant">
                                    Nombre total de personnes intéressées : {interestCount.loading ? 'Chargement...' : interestCount() ?? 0}
                                </p>
                            </div>
                        </Show>

                        <Show when={sessionData()?.user && interestedCoMembers() && interestedCoMembers()!.length > 0}>
                            <div class="mt-4 pt-4 border-t border-outline-variant">
                                <h4 class="text-title-medium font-semibold text-on-surface mb-2">Membres de vos organisations intéressés :</h4>
                                <ul class="list-disc list-inside text-body-medium text-on-surface-variant space-y-1">
                                    <For each={interestedCoMembers()}>
                                        {(member: InterestedUserForEvent) => (
                                            <li>{member.name || member.email}</li>
                                        )}
                                    </For>
                                </ul>
                            </div>
                        </Show>
                    </div>
                </div>
            )}
        </Show>
    );
};

export default EventDetailModal;

import { Show, type VoidComponent, Setter, Accessor } from "solid-js";
import type { Event as EventType } from "@prisma/client";

interface EventDetailModalProps {
    isOpen: Accessor<boolean>;
    setIsOpen: Setter<boolean>;
    event: Accessor<EventType | null>;
}

const EventDetailModal: VoidComponent<EventDetailModalProps> = (props) => {
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
                    <div class="bg-surface-container p-6 rounded-lg shadow-mat-level3 w-full max-w-xl m-4 relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={handleClose}
                            class="absolute top-3 right-3 p-2 rounded-full hover:bg-surface-variant text-on-surface-variant"
                            aria-label="Close event details"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
                                <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                            </svg>
                        </button>
                        <h2 class="text-3xl font-bold text-on-surface mb-2">{currentEvent.title}</h2>
                        <p class="text-sm text-on-surface-variant mb-4">Organisé par : {currentEvent.organizer?.name || currentEvent.organizer?.email || 'N/A'}</p>

                        <div class="space-y-3 text-on-surface-variant">
                            <p><strong class="text-on-surface">Date:</strong> {formatDate(currentEvent.date)}</p>
                            <p><strong class="text-on-surface">Adresse:</strong> {currentEvent.address}, {currentEvent.city}, {currentEvent.region}</p>
                            <div>
                                <strong class="text-on-surface">Description:</strong>
                                <p class="mt-1 whitespace-pre-wrap">{currentEvent.description}</p>
                            </div>
                            <p><strong class="text-on-surface">Coordonnées:</strong> Lat: {currentEvent.lat}, Lng: {currentEvent.lng}</p>
                        </div>
                        <Show when={currentEvent.lat && currentEvent.lng}>
                            <div class="mt-4">
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${currentEvent.lat},${currentEvent.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-on-primary bg-primary hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-focus"
                                >
                                    Voir sur la carte
                                    <svg class="ml-2 -mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                                    </svg>
                                </a>
                            </div>
                        </Show>
                    </div>
                </div>
            )}
        </Show>
    );
};

export default EventDetailModal;

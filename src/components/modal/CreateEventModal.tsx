import {
    Show,
    type VoidComponent,
    createSignal,
    Setter,
    Accessor,
    createEffect,
    onMount
} from "solid-js";
import { createEventAction } from "~/server/actions/eventActions";
import { useSubmission } from "@solidjs/router";

interface CreateEventModalProps {
    isOpen: Accessor<boolean>;
    setIsOpen: Setter<boolean>;
    onEventCreated?: () => void;
}

type LocalEventFormData = {
    title?: string;
    description?: string;
    date?: string;
    time?: string;
    address?: string;
    city?: string;
    region?: string;
    lat?: number;
    lng?: number;
};

const CreateEventModal: VoidComponent<CreateEventModalProps> = (props) => {
    let titleInputRef: HTMLInputElement | undefined;

    const [formData, setFormData] = createSignal<Partial<LocalEventFormData>>({
        title: "",
        description: "",
        date: new Date().toISOString().split('T')[0],
        time: "12:00",
        address: "",
        city: "",
        region: "",
        lat: 0,
        lng: 0,
    });

    const submission = useSubmission(createEventAction);

    onMount(() => {
        createEffect(() => {
            if (props.isOpen() && titleInputRef) {
                setTimeout(() => titleInputRef?.focus(), 50);
            }
        });
    });

    const handleClose = () => {
        if (submission.pending) return;
        props.setIsOpen(false);
        setFormData({
            title: "", description: "", date: new Date().toISOString().split('T')[0], time: "12:00",
            address: "", city: "", region: "", lat: 0, lng: 0,
        });
        submission.clear();
    };

    createEffect(() => {
        if (submission.result && !submission.pending && !submission.error) {
            props.onEventCreated?.();
            handleClose();
        }
    });

    const handleInput = (e: Event) => {
        const target = e.currentTarget as HTMLInputElement | HTMLTextAreaElement;
        const { name, value } = target;
        const val = target.type === 'number' ? parseFloat(value) : value;
        setFormData(prev => ({ ...prev, [name]: val }));
    };

    return (
        <Show when={props.isOpen()}>
            <div class="fixed inset-0 z-[60] flex items-center justify-center bg-scrim/50 p-4">
                <div class="bg-surface-container p-6 rounded-mat-corner-extra-large shadow-mat-level3 w-full max-w-lg m-4 relative max-h-[90vh] overflow-y-auto">
                    <button
                        onClick={handleClose}
                        disabled={submission.pending}
                        class="absolute top-4 right-4 p-2 rounded-mat-corner-full hover:bg-surface-container-high text-on-surface-variant disabled:opacity-50"
                        aria-label="Fermer la boîte de dialogue de création d'événement"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
                            <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                        </svg>
                    </button>
                    <h2 class="text-headline-small text-on-surface mb-6">Créer un Événement</h2>
                    <form action={createEventAction} method="post" class="space-y-4">
                        <div>
                            <label for="title" class="block text-label-large text-on-surface-variant">Titre</label>
                            <input ref={titleInputRef} type="text" name="title" id="title" value={formData().title || ""} onInput={handleInput} required class="mt-1 block w-full rounded-mat-corner-small border-outline bg-surface text-on-surface shadow-sm focus:border-primary py-2 px-3" />
                        </div>
                        <div>
                            <label for="description" class="block text-label-large text-on-surface-variant">Description</label>
                            <textarea name="description" id="description" rows="3" value={formData().description || ""} onInput={handleInput} required class="mt-1 block w-full rounded-mat-corner-small border-outline bg-surface text-on-surface shadow-sm focus:border-primary py-2 px-3"></textarea>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label for="date" class="block text-label-large text-on-surface-variant">Date</label>
                                <input type="date" name="date" id="date" value={formData().date || ""} onInput={handleInput} required class="mt-1 block w-full rounded-mat-corner-small border-outline bg-surface text-on-surface shadow-sm focus:border-primary py-2 px-3" />
                            </div>
                            <div>
                                <label for="time" class="block text-label-large text-on-surface-variant">Heure</label>
                                <input type="time" name="time" id="time" value={formData().time || ""} onInput={handleInput} required class="mt-1 block w-full rounded-mat-corner-small border-outline bg-surface text-on-surface shadow-sm focus:border-primary py-2 px-3" />
                            </div>
                        </div>
                        <div>
                            <label for="address" class="block text-label-large text-on-surface-variant">Adresse</label>
                            <input type="text" name="address" id="address" value={formData().address || ""} onInput={handleInput} required class="mt-1 block w-full rounded-mat-corner-small border-outline bg-surface text-on-surface shadow-sm focus:border-primary py-2 px-3" />
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label for="city" class="block text-label-large text-on-surface-variant">Ville</label>
                                <input type="text" name="city" id="city" value={formData().city || ""} onInput={handleInput} required class="mt-1 block w-full rounded-mat-corner-small border-outline bg-surface text-on-surface shadow-sm focus:border-primary py-2 px-3" />
                            </div>
                            <div>
                                <label for="region" class="block text-label-large text-on-surface-variant">Région</label>
                                <input type="text" name="region" id="region" value={formData().region || ""} onInput={handleInput} required class="mt-1 block w-full rounded-mat-corner-small border-outline bg-surface text-on-surface shadow-sm focus:border-primary py-2 px-3" />
                            </div>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label for="lat" class="block text-label-large text-on-surface-variant">Latitude</label>
                                <input type="number" step="any" name="lat" id="lat" value={formData().lat || 0} onInput={handleInput} required class="mt-1 block w-full rounded-mat-corner-small border-outline bg-surface text-on-surface shadow-sm focus:border-primary py-2 px-3" />
                            </div>
                            <div>
                                <label for="lng" class="block text-label-large text-on-surface-variant">Longitude</label>
                                <input type="number" step="any" name="lng" id="lng" value={formData().lng || 0} onInput={handleInput} required class="mt-1 block w-full rounded-mat-corner-small border-outline bg-surface text-on-surface shadow-sm focus:border-primary py-2 px-3" />
                            </div>
                        </div>
                        <Show when={submission.error}>
                            {(error) => (
                                <div class="my-2 p-3 bg-error-container text-on-error-container rounded-mat-corner-medium">
                                    <p class="text-body-medium whitespace-pre-wrap">
                                        {typeof error().error === 'string' ? error().error : (error().error?.message || "Une erreur est survenue.")}
                                        <Show when={error().details && typeof error().details === 'object'}>
                                            <ul class="mt-1 list-disc list-inside text-body-small">
                                                {Object.entries(error().details as Record<string, { _errors: string[] }>).map(([field, fieldErrors]) => (
                                                    <Show when={fieldErrors?._errors?.length > 0}>
                                                        <li>{field}: {fieldErrors._errors.join(", ")}</li>
                                                    </Show>
                                                ))}
                                            </ul>
                                        </Show>
                                    </p>
                                    <div class="mt-3 flex gap-2">
                                        <button type="button" onClick={() => submission.retry()} class="px-4 py-2 text-sm bg-primary/80 text-on-primary rounded-mat-corner-full hover:bg-primary font-label-large">Réessayer</button>
                                        <button type="button" onClick={() => submission.clear()} class="px-4 py-2 text-sm bg-surface-variant text-on-surface-variant rounded-mat-corner-full hover:brightness-95 font-label-large">Effacer</button>
                                    </div>
                                </div>
                            )}
                        </Show>

                        <button type="submit" disabled={submission.pending} class="w-full rounded-mat-corner-full bg-primary px-4 py-2.5 text-on-primary hover:brightness-110 disabled:opacity-50 font-label-large">
                            {submission.pending ? "Création..." : "Créer l'Événement"}
                        </button>
                    </form>
                </div>
            </div>
        </Show>
    );
};

export default CreateEventModal;

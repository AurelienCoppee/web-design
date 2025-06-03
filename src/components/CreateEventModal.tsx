import { Show, type VoidComponent, createSignal, Setter, Accessor, createEffect } from "solid-js";
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
                <div class="bg-surface-container p-6 rounded-lg shadow-mat-level3 w-full max-w-lg m-4 relative max-h-[90vh] overflow-y-auto">
                    <button
                        onClick={handleClose}
                        disabled={submission.pending}
                        class="absolute top-3 right-3 p-2 rounded-full hover:bg-surface-variant text-on-surface-variant disabled:opacity-50"
                        aria-label="Fermer la boîte de dialogue de création d'événement"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
                            <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                        </svg>
                    </button>
                    <h2 class="text-2xl font-bold text-on-surface mb-6">Créer un Événement</h2>
                    <form
                        action={createEventAction}
                        method="post"
                        class="space-y-4"
                    >
                        <div>
                            <label for="title" class="block text-sm font-medium text-on-surface-variant">Titre</label>
                            <input type="text" name="title" id="title" value={formData().title || ""} onInput={handleInput} required class="mt-1 block w-full rounded-md border-outline bg-surface text-on-surface shadow-sm focus:border-primary" />
                        </div>
                        <div>
                            <label for="description" class="block text-sm font-medium text-on-surface-variant">Description</label>
                            <textarea name="description" id="description" rows="3" value={formData().description || ""} onInput={handleInput} required class="mt-1 block w-full rounded-md border-outline bg-surface text-on-surface shadow-sm focus:border-primary"></textarea>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label for="date" class="block text-sm font-medium text-on-surface-variant">Date</label>
                                <input type="date" name="date" id="date" value={formData().date || ""} onInput={handleInput} required class="mt-1 block w-full rounded-md border-outline bg-surface text-on-surface shadow-sm focus:border-primary" />
                            </div>
                            <div>
                                <label for="time" class="block text-sm font-medium text-on-surface-variant">Heure</label>
                                <input type="time" name="time" id="time" value={formData().time || ""} onInput={handleInput} required class="mt-1 block w-full rounded-md border-outline bg-surface text-on-surface shadow-sm focus:border-primary" />
                            </div>
                        </div>
                        <div>
                            <label for="address" class="block text-sm font-medium text-on-surface-variant">Adresse</label>
                            <input type="text" name="address" id="address" value={formData().address || ""} onInput={handleInput} required class="mt-1 block w-full rounded-md border-outline bg-surface text-on-surface shadow-sm focus:border-primary" />
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label for="city" class="block text-sm font-medium text-on-surface-variant">Ville</label>
                                <input type="text" name="city" id="city" value={formData().city || ""} onInput={handleInput} required class="mt-1 block w-full rounded-md border-outline bg-surface text-on-surface shadow-sm focus:border-primary" />
                            </div>
                            <div>
                                <label for="region" class="block text-sm font-medium text-on-surface-variant">Région</label>
                                <input type="text" name="region" id="region" value={formData().region || ""} onInput={handleInput} required class="mt-1 block w-full rounded-md border-outline bg-surface text-on-surface shadow-sm focus:border-primary" />
                            </div>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label for="lat" class="block text-sm font-medium text-on-surface-variant">Latitude</label>
                                <input type="number" step="any" name="lat" id="lat" value={formData().lat || 0} onInput={handleInput} required class="mt-1 block w-full rounded-md border-outline bg-surface text-on-surface shadow-sm focus:border-primary" />
                            </div>
                            <div>
                                <label for="lng" class="block text-sm font-medium text-on-surface-variant">Longitude</label>
                                <input type="number" step="any" name="lng" id="lng" value={formData().lng || 0} onInput={handleInput} required class="mt-1 block w-full rounded-md border-outline bg-surface text-on-surface shadow-sm focus:border-primary" />
                            </div>
                        </div>

                        <Show when={submission.error}>
                            <p class="text-sm text-error whitespace-pre-wrap">
                                {submission.error.error || "Une erreur est survenue."}
                                <Show when={submission.error.details}>
                                    <ul>
                                        {Object.entries(submission.error.details as Record<string, { _errors: string[] }>).map(([field, err]) => (
                                            <Show when={err._errors.length > 0}>
                                                <li>{field}: {err._errors.join(", ")}</li>
                                            </Show>
                                        ))}
                                    </ul>
                                </Show>
                            </p>
                        </Show>

                        <button type="submit" disabled={submission.pending} class="w-full rounded-md bg-primary px-4 py-2 text-on-primary hover:brightness-110 disabled:opacity-50">
                            {submission.pending ? "Création..." : "Créer l'Événement"}
                        </button>
                    </form>
                </div>
            </div>
        </Show>
    );
};

export default CreateEventModal;

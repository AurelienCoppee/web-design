import { Show, type VoidComponent, createSignal, Setter, Accessor } from "solid-js";
import type { Event as EventType } from "@prisma/client";

interface CreateEventModalProps {
    isOpen: Accessor<boolean>;
    setIsOpen: Setter<boolean>;
}

type EventFormData = Omit<EventType, "id" | "organizerId" | "createdAt" | "updatedAt" | "date"> & {
    date: string;
    time: string;
};

const CreateEventModal: VoidComponent<CreateEventModalProps> = (props) => {
    const [formData, setFormData] = createSignal<Partial<EventFormData>>({
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
    const [errorMessage, setErrorMessage] = createSignal("");
    const [isLoading, setIsLoading] = createSignal(false);

    const handleClose = () => {
        if (isLoading()) return;
        setErrorMessage("");
        props.setIsOpen(false);
    };

    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage("");

        const currentFormData = formData();
        if (!currentFormData.date || !currentFormData.time) {
            setErrorMessage("Date and time are required.");
            setIsLoading(false);
            return;
        }

        const dateTimeString = `${currentFormData.date}T${currentFormData.time}:00.000Z`;


        const payload = {
            ...currentFormData,
            date: dateTimeString,
            lat: Number(currentFormData.lat) || 0,
            lng: Number(currentFormData.lng) || 0,
        };
        delete payload.time;

        try {
            const response = await fetch("/api/events/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            setIsLoading(false);

            if (!response.ok) {
                setErrorMessage(data.error || `Error ${response.status}: ${data.message || "Failed to create event."}`);
                if (data.details) {
                    console.error("Validation errors:", data.details);
                    const formattedErrors = Object.entries(data.details)
                        .map(([field, fieldError]: [string, any]) => fieldError._errors.length > 0 ? `${field}: ${fieldError._errors.join(', ')}` : null)
                        .filter(Boolean)
                        .join('\n');
                    setErrorMessage(prev => `${prev}\n${formattedErrors}`);
                }
                return;
            }
            handleClose();
        } catch (err) {
            setIsLoading(false);
            setErrorMessage("Network error or failed to parse server response.");
            console.error(err);
        }
    };

    const handleInput = (e: Event) => {
        const { name, value } = e.currentTarget as HTMLInputElement | HTMLTextAreaElement;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <Show when={props.isOpen()}>
            <div class="fixed inset-0 z-[60] flex items-center justify-center bg-scrim/50 p-4">
                <div class="bg-surface-container p-6 rounded-lg shadow-mat-level3 w-full max-w-lg m-4 relative max-h-[90vh] overflow-y-auto">
                    <button
                        onClick={handleClose}
                        disabled={isLoading()}
                        class="absolute top-3 right-3 p-2 rounded-full hover:bg-surface-variant text-on-surface-variant disabled:opacity-50"
                        aria-label="Close create event dialog"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
                            <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                        </svg>
                    </button>
                    <h2 class="text-2xl font-bold text-on-surface mb-6">Créer un Événement</h2>
                    <form onSubmit={handleSubmit} class="space-y-4">
                        <div>
                            <label for="title" class="block text-sm font-medium text-on-surface-variant">Titre</label>
                            <input type="text" name="title" id="title" value={formData().title || ""} onInput={handleInput} required class="mt-1 block w-full" />
                        </div>
                        <div>
                            <label for="description" class="block text-sm font-medium text-on-surface-variant">Description</label>
                            <textarea name="description" id="description" rows="3" value={formData().description || ""} onInput={handleInput} required class="mt-1 block w-full"></textarea>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label for="date" class="block text-sm font-medium text-on-surface-variant">Date</label>
                                <input type="date" name="date" id="date" value={formData().date || ""} onInput={handleInput} required class="mt-1 block w-full" />
                            </div>
                            <div>
                                <label for="time" class="block text-sm font-medium text-on-surface-variant">Heure</label>
                                <input type="time" name="time" id="time" value={formData().time || ""} onInput={handleInput} required class="mt-1 block w-full" />
                            </div>
                        </div>
                        <div>
                            <label for="address" class="block text-sm font-medium text-on-surface-variant">Adresse</label>
                            <input type="text" name="address" id="address" value={formData().address || ""} onInput={handleInput} required class="mt-1 block w-full" />
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label for="city" class="block text-sm font-medium text-on-surface-variant">Ville</label>
                                <input type="text" name="city" id="city" value={formData().city || ""} onInput={handleInput} required class="mt-1 block w-full" />
                            </div>
                            <div>
                                <label for="region" class="block text-sm font-medium text-on-surface-variant">Région</label>
                                <input type="text" name="region" id="region" value={formData().region || ""} onInput={handleInput} required class="mt-1 block w-full" />
                            </div>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label for="lat" class="block text-sm font-medium text-on-surface-variant">Latitude</label>
                                <input type="number" step="any" name="lat" id="lat" value={formData().lat || 0} onInput={handleInput} required class="mt-1 block w-full" />
                            </div>
                            <div>
                                <label for="lng" class="block text-sm font-medium text-on-surface-variant">Longitude</label>
                                <input type="number" step="any" name="lng" id="lng" value={formData().lng || 0} onInput={handleInput} required class="mt-1 block w-full" />
                            </div>
                        </div>

                        <Show when={errorMessage()}>
                            <p class="text-sm text-error whitespace-pre-wrap">{errorMessage()}</p>
                        </Show>

                        <button type="submit" disabled={isLoading()} class="w-full rounded-md bg-primary px-4 py-2 text-on-primary hover:brightness-110 disabled:opacity-50">
                            {isLoading() ? "Création..." : "Créer l'Événement"}
                        </button>
                    </form>
                </div>
            </div>
        </Show>
    );
};

export default CreateEventModal;

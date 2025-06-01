import type { VoidComponent } from "solid-js";

interface AddEventFABProps {
    onClick: () => void;
}

const AddEventFAB: VoidComponent<AddEventFABProps> = (props) => {
    return (
        <button
            onClick={props.onClick}
            class="fixed bottom-6 right-6 bg-primary text-on-primary rounded-mat-corner-medium h-14 px-6 flex items-center justify-center gap-3 shadow-mat-level3 hover:brightness-110 transition-transform duration-150 ease-out active:scale-95"
            aria-label="Ajouter un nouvel événement"
        >
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true">
                <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z" />
            </svg>
            <span class="text-sm font-medium tracking-wide">
                Nouvel événement
            </span>
        </button>
    );
};

export default AddEventFAB;

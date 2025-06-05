import { Show, For, type VoidComponent, Setter, Accessor, createSignal, createEffect, createMemo } from "solid-js";
import { createAsync, useSubmission, revalidate } from "@solidjs/router";
import { getOrganizationMembers, type OrganizationMembershipWithUser } from "~/server/queries/organizationQueries";
import { addOrganizationMemberAction } from "~/server/actions/organizationActions";

interface ManageOrganizationModalProps {
    isOpen: Accessor<boolean>;
    setIsOpen: Setter<boolean>;
    organizationId: Accessor<string | null>;
}

const ManageOrganizationModal: VoidComponent<ManageOrganizationModalProps> = (props) => {
    const organizationId = createMemo(() => props.organizationId());
    const members = createAsync(() => organizationId() ? getOrganizationMembers(organizationId()!) : Promise.resolve([]), {
        deferStream: true,
    });

    const [newMemberEmail, setNewMemberEmail] = createSignal("");
    const [newMemberRole, setNewMemberRole] = createSignal<"MEMBER" | "ADMIN">("MEMBER");

    const addMemberSubmission = useSubmission(addOrganizationMemberAction);

    createEffect(() => {
        if (props.isOpen() && organizationId()) {
            revalidate(getOrganizationMembers.keyFor(organizationId()!));
        }
        if (!props.isOpen() || !organizationId()) {
            setNewMemberEmail("");
            setNewMemberRole("MEMBER");
            addMemberSubmission.clear();
        }
    });

    const handleAddMember = async (e: SubmitEvent) => {
        e.preventDefault();
        if (!organizationId()) return;
        const formData = new FormData();
        formData.append("organizationId", organizationId()!);
        formData.append("email", newMemberEmail());
        formData.append("role", newMemberRole());
        await addOrganizationMemberAction(formData);
        if (!addMemberSubmission.error) {
            setNewMemberEmail("");
        }
    };


    const handleClose = () => {
        if (addMemberSubmission.pending) return;
        props.setIsOpen(false);
    };

    return (
        <Show when={props.isOpen() && organizationId()}>
            <div class="fixed inset-0 z-[70] flex items-center justify-center bg-scrim/50 p-4">
                <div class="bg-surface-container p-6 rounded-mat-corner-extra-large shadow-mat-level3 w-full max-w-xl m-4 relative max-h-[90vh] overflow-y-auto">
                    <button
                        onClick={handleClose}
                        class="absolute top-4 right-4 p-2 rounded-mat-corner-full hover:bg-surface-container-high text-on-surface-variant disabled:opacity-50"
                        aria-label="Fermer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" /></svg>
                    </button>
                    <h2 class="text-headline-small text-on-surface mb-2">Gérer l'Organisation</h2>
                    <h3 class="text-title-medium font-semibold text-on-surface-variant mt-4 mb-2">Membres</h3>
                    <Show when={members.loading}><p class="text-body-medium text-on-surface-variant">Chargement des membres...</p></Show>
                    <ul class="space-y-1">
                        <For each={members()}>
                            {(member: OrganizationMembershipWithUser) => (
                                <li class="flex justify-between items-center py-1 px-2 rounded-mat-corner-small hover:bg-surface-container-low">
                                    <span class="text-body-medium text-on-surface-variant">{member.user.name || member.user.email} (<span class="text-label-small text-tertiary">{member.role}</span>)</span>
                                </li>
                            )}
                        </For>
                    </ul>

                    <h3 class="text-title-medium font-semibold text-on-surface-variant mt-6 mb-2">Ajouter un Membre</h3>
                    <form onSubmit={handleAddMember} class="space-y-3">
                        <div>
                            <label for="new-member-email" class="block text-label-large text-on-surface-variant">Email</label>
                            <input type="email" id="new-member-email" value={newMemberEmail()} onInput={e => setNewMemberEmail(e.currentTarget.value)} required class="mt-1 block w-full rounded-mat-corner-small border-outline bg-surface text-on-surface shadow-sm focus:border-primary py-2 px-3" />
                        </div>
                        <div>
                            <label for="new-member-role" class="block text-label-large text-on-surface-variant">Rôle</label>
                            <select id="new-member-role" value={newMemberRole()} onChange={e => setNewMemberRole(e.currentTarget.value as any)} class="mt-1 block w-full rounded-mat-corner-small border-outline bg-surface text-on-surface shadow-sm focus:border-primary py-2 px-3">
                                <option value="MEMBER">Membre</option>
                                <option value="ADMIN">Admin</option>
                            </select>
                        </div>
                        <button type="submit" disabled={addMemberSubmission.pending} class="px-6 py-2.5 bg-primary text-on-primary rounded-mat-corner-full hover:brightness-110 disabled:opacity-50 font-label-large">
                            {addMemberSubmission.pending ? "Ajout..." : "Ajouter Membre"}
                        </button>
                        <Show when={addMemberSubmission.error}>
                            <p class="text-body-small text-error">{addMemberSubmission.error.message || "Erreur lors de l'ajout."}</p>
                        </Show>
                        <Show when={addMemberSubmission.result?.success && !addMemberSubmission.error}>
                            <p class="text-body-small text-green-500">{addMemberSubmission.result.message}</p>
                        </Show>
                    </form>
                </div>
            </div>
        </Show>
    );
};
export default ManageOrganizationModal;

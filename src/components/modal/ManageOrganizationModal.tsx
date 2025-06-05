// src/components/modal/ManageOrganizationModal.tsx
import { Show, For, type VoidComponent, Setter, Accessor, createSignal, createEffect } from "solid-js";
import { createAsync, useSubmission, revalidate } from "@solidjs/router";
import { getOrganizationMembers, type OrganizationMembershipWithUser } from "~/server/queries/organizationQueries";
import { addOrganizationMemberAction /* removeOrganizationMemberAction */ } from "~/server/actions/organizationActions"; // Assuming remove exists

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
    // const removeMemberSubmission = useSubmission(removeOrganizationMemberAction);

    createEffect(() => {
        if (props.isOpen() && organizationId()) {
            revalidate(getOrganizationMembers.keyFor(organizationId()!));
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
        setNewMemberEmail(""); // Clear field on success/attempt
    };

    // const handleRemoveMember = async (membershipId: string) => { /* ... */ };

    const handleClose = () => {
        if (addMemberSubmission.pending /*|| removeMemberSubmission.pending*/) return;
        props.setIsOpen(false);
        setNewMemberEmail("");
        addMemberSubmission.clear();
    };

    return (
        <Show when={props.isOpen() && organizationId()}>
            <div class="fixed inset-0 z-[70] flex items-center justify-center bg-scrim/50 p-4">
                <div class="bg-surface-container p-6 rounded-lg shadow-mat-level3 w-full max-w-xl m-4 relative max-h-[90vh] overflow-y-auto">
                    <button onClick={handleClose} /* ... close button svg ... */ >
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" /></svg>
                    </button>
                    <h2 class="text-2xl font-bold text-on-surface mb-2">Gérer l'Organisation</h2>
                    {/* Could fetch and display org name here */}
                    <h3 class="text-lg font-semibold text-on-surface-variant mt-4 mb-2">Membres</h3>
                    <Show when={members.loading}><p>Chargement des membres...</p></Show>
                    <ul>
                        <For each={members()}>
                            {(member: OrganizationMembershipWithUser) => (
                                <li class="flex justify-between items-center py-1">
                                    <span>{member.user.name || member.user.email} ({member.role})</span>
                                    {/* <button onClick={() => handleRemoveMember(member.id)} class="text-error">Supprimer</button> */}
                                </li>
                            )}
                        </For>
                    </ul>

                    <h3 class="text-lg font-semibold text-on-surface-variant mt-6 mb-2">Ajouter un Membre</h3>
                    <form onSubmit={handleAddMember} class="space-y-3">
                        <div>
                            <label for="new-member-email" class="block text-sm">Email</label>
                            <input type="email" id="new-member-email" value={newMemberEmail()} onInput={e => setNewMemberEmail(e.currentTarget.value)} required class="mt-1 block w-full rounded-md border-outline bg-surface text-on-surface shadow-sm focus:border-primary" />
                        </div>
                        <div>
                            <label for="new-member-role" class="block text-sm">Rôle</label>
                            <select id="new-member-role" value={newMemberRole()} onChange={e => setNewMemberRole(e.currentTarget.value as any)} class="mt-1 block w-full rounded-md border-outline bg-surface text-on-surface shadow-sm focus:border-primary">
                                <option value="MEMBER">Membre</option>
                                <option value="ADMIN">Admin</option>
                            </select>
                        </div>
                        <button type="submit" disabled={addMemberSubmission.pending} class="px-4 py-2 bg-primary text-on-primary rounded hover:brightness-110 disabled:opacity-50">
                            {addMemberSubmission.pending ? "Ajout..." : "Ajouter Membre"}
                        </button>
                        <Show when={addMemberSubmission.error}>
                            <p class="text-sm text-error">{addMemberSubmission.error.message || "Erreur lors de l'ajout."}</p>
                        </Show>
                        <Show when={addMemberSubmission.result?.success}>
                            <p class="text-sm text-green-500">{addMemberSubmission.result.message}</p>
                        </Show>
                    </form>
                </div>
            </div>
        </Show>
    );
};
export default ManageOrganizationModal;

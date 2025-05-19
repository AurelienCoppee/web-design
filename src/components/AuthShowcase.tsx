import { VoidComponent, Show } from "solid-js";
import { query, createAsync } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";
import { getSession } from "@auth/solid-start";
import { authOptions } from "~/server/auth";
import { signIn, signOut } from "@auth/solid-start/client";

const getAuthSession = query(
  async () => {
    "use server";
    const event = getRequestEvent();
    if (!event) return null;
    return await getSession(event.request, authOptions);
  },
  "authSession"
);

const AuthShowcase: VoidComponent = () => {
  const session = createAsync(() => getAuthSession());

  return (
    <Show when={!session.loading} fallback={<div>Loading…</div>}>
      {session()?.user ? (
        <div class="flex flex-col gap-3">
          <span class="text-xl text-white">
            Welcome {session()!.user.name}
          </span>
          <button
            onClick={() => signOut()}
            class="rounded-full bg-white/10 px-10 py-3 font-semibold text-white transition hover:bg-white/20"
          >
            Sign out
          </button>
        </div>
      ) : (
        <button
          onClick={() => signIn("google")}
          class="rounded-full bg-white/10 px-10 py-3 font-semibold text-white transition hover:bg-white/20"
        >
          Sign in
        </button>
      )}
    </Show>
  );
};

export default AuthShowcase;

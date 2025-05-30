import SiteTitle from "~/components/SiteTitle";
import { Meta } from "@solidjs/meta";
import { A } from "@solidjs/router";
import { type VoidComponent } from "solid-js";
import AuthForm from "~/components/AuthForm";

const Home: VoidComponent = () => {
  return (
    <>
      <SiteTitle>Home</SiteTitle>
      <Meta name="description" content="This is my content tag." />
      <main class="flex min-h-screen flex-col items-center justify-center bg-background">
        <div class="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
          <h1 class="text-5xl font-extrabold tracking-tight text-on-background sm:text-[5rem]">
            Create <span class="text-[hsl(88,_77%,_78%)]">JD</span> App
          </h1>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
            <A
              class="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 text-on-background hover:bg-white/20"
              href="https://start.solidjs.com"
              target="_blank"
            >
              <h3 class="text-2xl font-bold">Solid Start →</h3>
              <div class="text-lg">
                Learn more about Solid Start and the basics.
              </div>
            </A>
            <A
              class="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 text-on-background hover:bg-white/20"
              href="https://github.com/orjdev/create-jd-app"
              target="_blank"
            >
              <h3 class="text-2xl font-bold">JD End →</h3>
              <div class="text-lg">
                Learn more about Create JD App, the libraries it uses, and how to
                deploy it.
              </div>
            </A>
          </div>
          <AuthForm />
        </div>
      </main>
    </>
  );
};

export default Home;

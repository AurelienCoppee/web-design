import { A } from "@solidjs/router";
import { Meta, Title, Link } from "@solidjs/meta";

export default function NotFound() {
  return (
    <>
      <Title>Page Non Trouvée - Ralvo</Title>
      <Meta name="description" content="La page que vous recherchez n'a pas été trouvée sur Ralvo." />
      <Link rel="canonical" href="https://ralvo.be/404" />
      <main class="text-center mx-auto text-on-surface p-4 pt-24 md:pt-28 min-h-screen flex flex-col justify-center items-center bg-surface">
        <h1 class="text-display-small sm:text-display-medium md:text-display-large text-primary font-bold uppercase my-8">
          404
        </h1>
        <h2 class="text-headline-small sm:text-headline-medium text-on-surface-variant mb-6">
          Oups! Page non trouvée.
        </h2>
        <p class="text-body-large text-on-surface-variant mb-10 max-w-md">
          Désolé, la page que vous essayez d'atteindre n'existe pas ou a été déplacée.
        </p>
        <A
          href="/"
          class="inline-flex items-center justify-center px-6 py-3 bg-primary text-on-primary rounded-mat-corner-full font-label-large hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-focus transition-colors shadow-mat-level1 hover:shadow-mat-level2"
        >
          Retour à l'accueil
        </A>
      </main>
    </>
  );
}

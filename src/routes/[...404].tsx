import { A } from "@solidjs/router";
import { Meta, Title, Link } from "@solidjs/meta";

export default function NotFound() {
  return (
    <>
      <Title>404 - Page Non Trouvée - Ralvo</Title>
      <Meta name="robots" content="noindex" />
      <Link rel="canonical" href="https://ralvo.be/404" />
      <main class="text-center mx-auto text-on-surface p-4 pt-24 md:pt-28 min-h-screen flex flex-col justify-center items-center bg-surface">
        <h1 class="text-display-large text-primary font-bold my-4">
          404
        </h1>
        <h2 class="text-headline-medium text-on-surface-variant mb-4">
          Oups! Page non trouvée.
        </h2>
        <p class="text-body-large text-on-surface-variant mb-8 max-w-md">
          Désolé, la page que vous essayez d'atteindre n'existe pas ou a été déplacée.
        </p>
        <A
          href="/"
          class="inline-flex items-center justify-center px-8 py-3 bg-primary text-on-primary rounded-mat-corner-full font-label-large hover:shadow-mat-level2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all shadow-mat-level1"
        >
          Retour à l'accueil
        </A>
      </main>
    </>
  );
}

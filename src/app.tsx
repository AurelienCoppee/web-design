import { Router } from "@solidjs/router";
import { Meta, Link, Base } from "@solidjs/meta";
import { MetaProvider } from "@solidjs/meta";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import Header from "~/components/Header";
import "./styles/global.css";

export default function App() {
  return (
    <MetaProvider>
      <Meta charset="utf-8" />
      <Meta name="viewport" content="width=device-width, initial-scale=1" />
      <Base href="/" />
      <Link rel="icon" href="/favicon.ico" />
      <Router
        root={props => (
          <>
            <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-1/2 focus:translate-x-[-50%] focus:z-[999] focus:p-3 focus:bg-primary focus:text-on-primary focus:rounded-mat-corner-medium">
              Aller au contenu principal
            </a>
            <Header />
            <Suspense>{props.children}</Suspense>
          </>
        )}
      >
        <FileRoutes />
      </Router>
    </MetaProvider>
  );
}

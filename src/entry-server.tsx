// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="fr">
        <head>
          {assets}
          <script is:inline>
            document.documentElement.classList.toggle(
            "dark",
            localStorage.theme === "dark" ||
            (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches)
            );

            const contrast = localStorage.getItem("contrast");
            if (contrast === "mc") document.documentElement.classList.add("mc");
            else if (contrast === "hc") document.documentElement.classList.add("hc");
          </script>
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));

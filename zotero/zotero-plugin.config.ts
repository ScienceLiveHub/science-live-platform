import { defineConfig } from "zotero-plugin-scaffold";
import { sparqlFilesPlugin } from "../shared/sparql-plugin/esbuild";
import pkg from "./package.json";

const server = process.env.API_URL || "https://api.sciencelive4all.org";
const metaEnvDefs = {
  // Replace import.meta.env.VITE_API_URL with the server URL
  "import.meta.env.VITE_API_URL": `"${server}"`,
  // Replace import.meta.env.PROD with boolean
  "import.meta.env.PROD":
    process.env.NODE_ENV === "production" ? "true" : "false",
};

export default defineConfig({
  source: ["src", "addon"],
  dist: ".scaffold/build",
  name: pkg.config.addonName,
  id: pkg.config.addonID,
  namespace: pkg.config.addonRef,
  updateURL: `https://github.com/{{owner}}/{{repo}}/releases/download/release/${
    pkg.version.includes("-") ? "update-beta.json" : "update.json"
  }`,
  xpiDownloadLink:
    "https://github.com/{{owner}}/{{repo}}/releases/download/v{{version}}/{{xpiName}}.xpi",

  build: {
    assets: ["addon/**/*.*"],
    define: {
      ...pkg.config,
      author: pkg.author,
      description: pkg.description,
      homepage: pkg.homepage,
      buildVersion: pkg.version,
      buildTime: "{{buildTime}}",
      env: process.env.NODE_ENV,
      api: server,
    },
    prefs: {
      prefix: pkg.config.prefsPrefix,
    },
    esbuildOptions: [
      {
        entryPoints: ["src/index.ts"],
        define: {
          __env__: `"${process.env.NODE_ENV}"`,
          __api__: `"${server}"`,
          ...metaEnvDefs,
        },
        bundle: true,
        platform: "browser",
        target: "firefox115",
        outfile: `.scaffold/build/addon/content/scripts/${pkg.config.addonRef}.js`,
        // Add loader configuration for image files (e.g. used in css `background-image: url(images/bg.png);`)
        loader: {
          ".png": "file",
          ".svg": "file",
        },
        plugins: [sparqlFilesPlugin()],
      },
      // React dialogs running in an iframe context need their own entrypoint and outdir
      {
        entryPoints: ["src/dialogs/createNanopub/index.tsx"],
        bundle: true,
        target: "firefox115",
        outdir: `.scaffold/build/addon/content/scripts/dialogs/createNanopub`,
        define: metaEnvDefs,
        loader: {
          ".png": "file",
          ".svg": "file",
        },
        plugins: [sparqlFilesPlugin()],
      },
    ],
  },

  test: {
    waitForPlugin: `() => Zotero.${pkg.config.addonInstance}.data.initialized`,
  },

  // If you need to see a more detailed log, uncomment the following line:
  // logLevel: "trace",
});

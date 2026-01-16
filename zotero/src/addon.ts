/**
 * addon is a global, accessible throughout the plugin (along with Zotero and ztoolkit).
 *
 * Add any global modules or variables you want.
 */
import { config } from "../package.json";
import { ColumnOptions, DialogHelper } from "zotero-plugin-toolkit";
import hooks from "./hooks";
import { createZToolkit } from "./utils/ztoolkit";
import { NanopubSearch } from "./modules/nanopubSearch";
import { NanopubDisplay } from "./modules/nanopubDisplay";

class Addon {
  public data: {
    alive: boolean;
    config: typeof config;
    // Env type, see build.js
    env: "development" | "production";
    initialized?: boolean;
    ztoolkit: ZToolkit;
    searchModule: NanopubSearch;
    displayModule: NanopubDisplay;
    locale?: {
      current: any;
    };
    prefs?: {
      window: Window;
    };
    dialog?: DialogHelper;
  };
  // Lifecycle hooks
  public hooks: typeof hooks;
  // APIs
  public api: object;

  constructor() {
    this.data = {
      alive: true,
      config,
      env: __env__,
      initialized: false,
      ztoolkit: createZToolkit(),
      searchModule: new NanopubSearch(),
      displayModule: new NanopubDisplay(),
    };
    this.hooks = hooks;
    this.api = {};
  }
}

export default Addon;

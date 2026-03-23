import path from "path";
import fs from "fs/promises";
import { exec } from "child_process";
import util from "util";
import { pathToFileURL } from "url";
import { createRequire } from "module";

import { Plugin } from "../types/index.js";

const execAsync = util.promisify(exec);

export class RemotePluginLoader {
  private pluginsDir = path.join(process.cwd(), ".forge", "plugins");

  async loadFromGitHub(repo: string): Promise<Plugin> {
    const pluginName = repo.replace("/", "_");
    const pluginPath = path.join(this.pluginsDir, pluginName);

    // ✅ Ensure plugins directory exists
    await fs.mkdir(this.pluginsDir, { recursive: true });

    // ✅ Clone repo if not already present
    try {
      await fs.access(pluginPath);
      console.log(`Plugin already exists locally: ${pluginName}`);
    } catch {
      console.log(`Downloading plugin from ${repo}...`);

      await execAsync(
        `git clone https://github.com/${repo}.git "${pluginPath}"`,
      );
    }

    // ✅ Resolve entry file
    const possibleEntries = ["index.js", "dist/index.js"];

    let entryPath: string | null = null;

    for (const file of possibleEntries) {
      const fullPath = path.join(pluginPath, file);
      try {
        await fs.access(fullPath);
        entryPath = fullPath;
        break;
      } catch {}
    }

    if (!entryPath) {
      throw new Error(
        `No valid entry file found in plugin.
Expected: index.js or dist/index.js`,
      );
    }

    try {
      const fileUrl = pathToFileURL(entryPath).href;

      let pluginModule: any;

      try {
        pluginModule = await import(fileUrl);
      } catch (err) {
        console.error("❌ IMPORT ERROR:", err);
        throw new Error(`ESM import failed`);
      }

      const plugin: Plugin = pluginModule.default;

      if (!plugin || typeof plugin.apply !== "function") {
        throw new Error("Invalid plugin: must export default with apply()");
      }

      return plugin;
    } catch (err) {
      console.error("❌ REAL ERROR:", err);

      throw new Error(
        `Failed to load plugin from ${repo}.
Make sure:
- index.js exists at root OR dist/index.js
- exports default OR module.exports
- plugin has apply() method`,
      );
    }
  }
}

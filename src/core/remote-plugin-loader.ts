import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import util from 'util';
import { Plugin } from "../types";

const execAsync = util.promisify(exec);

export class RemotePluginLoader {
  private pluginsDir = path.join(process.cwd(), '.forge', 'plugins');

  async loadFromGitHub(repo: string): Promise<Plugin> {
    const pluginName = repo.replace('/', '_');
    const pluginPath = path.join(this.pluginsDir, pluginName);

    // ✅ Ensure plugins directory exists
    await fs.mkdir(this.pluginsDir, { recursive: true });

    // ✅ If already exists → skip clone
    try {
      await fs.access(pluginPath);
      console.log(`Plugin already exists locally: ${pluginName}`);
    } catch {
      console.log(`Downloading plugin from ${repo}...`);

      // ✅ FIXED URL
      await execAsync(
        `git clone https://github.com/${repo}.git "${pluginPath}"`
      );
    }

    // ✅ IMPORTANT: load index.js explicitly
    const pluginEntry = path.join(pluginPath, 'index.js');

    try {
      const pluginModule = await import(pluginEntry);

      if (!pluginModule.default) {
        throw new Error('Plugin must export default');
      }

      return pluginModule.default as Plugin;
    } catch (err) {
      throw new Error(
        `Failed to load plugin from ${repo}. Make sure it has index.js with default export.`
      );
    }
  }
}
import fs from 'fs/promises';
import path from 'path';
import { Plugin } from '../types/index.js';

/**
 * Handles runtime-loaded plugins (old system upgraded)
 */
export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();

  async loadPlugins(): Promise<void> {
    const pluginsDir = path.resolve(process.cwd(), 'plugins');

    try {
      const pluginFolders = await fs.readdir(pluginsDir);

      for (const folder of pluginFolders) {
        const pluginEntry = path.join(pluginsDir, folder, 'index.js');

        try {
          // check if index.js exists
          await fs.access(pluginEntry);

          const mod = await import(pluginEntry);
          const plugin: Plugin = mod.default;

          this.plugins.set(plugin.name, plugin);
        } catch {
          // skip invalid plugin folders
          continue;
        }
      }
    } catch {
      // plugins folder may not exist → ignore
    }
  }

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }
}

/**
 * 🔥 NEW: Plugin Resolver (for .forge plugins)
 */
export class PluginResolver {
  async resolve(pluginName: string, projectRoot: string): Promise<string> {
    const localPath = path.join(projectRoot, '.forge', 'plugins', pluginName);

    try {
      await fs.access(localPath);
      return localPath;
    } catch {
      throw new Error(
        `Plugin "${pluginName}" not found in ${path.join(projectRoot, '.forge/plugins')}`
      );
    }
  }
}

/**
 * 🔥 NEW: Plugin Config Interface
 */
export interface PluginConfig {
  name: string;
  version: string;
  files?: {
    from: string;
    to: string;
  }[];
  dependencies?: string[];
  modify?: {
    file: string;
    type: 'wrap' | 'append' | 'prepend';
    target?: string;
    with?: string;
    content?: string;
  }[];
}

/**
 * 🔥 Load plugin.json
 */
export async function loadPluginConfig(
  pluginPath: string
): Promise<PluginConfig> {
  const configPath = path.join(pluginPath, 'plugin.json');

  try {
    const data = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(data);

    if (!config.name) {
      throw new Error('Plugin must have a name');
    }

    return config;
  } catch {
    throw new Error(`Invalid plugin config at ${configPath}`);
  }
}

/**
 * 🔥 Copy plugin files into project
 */
export async function copyPluginFiles(
  pluginPath: string,
  projectPath: string,
  files: { from: string; to: string }[],
  replacements: Record<string, string> = {}
) {
  for (const file of files) {
    const sourcePath = path.join(pluginPath, file.from);
    const targetPath = path.join(projectPath, file.to);

    // ensure target directory exists
    await fs.mkdir(path.dirname(targetPath), { recursive: true });

    const isTextFile = /\.(ts|tsx|js|jsx|json|md|css|html)$/.test(sourcePath);

    if (isTextFile) {
      let content = await fs.readFile(sourcePath, 'utf-8');

      // 🔥 placeholder replacement
      content = content.replace(/\{\{(.*?)\}\}/g, (_, key) => {
        return replacements[key] || `{{${key}}}`;
      });

      await fs.writeFile(targetPath, content, 'utf-8');
    } else {
      const buffer = await fs.readFile(sourcePath);
      await fs.writeFile(targetPath, buffer);
    }

    console.log(`Created: ${targetPath}`);
  }
}
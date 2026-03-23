import path from 'path';
import { Plugin } from '../types/index.js';

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();

  async loadPlugins(): Promise<void> {
    const pluginModules = [
      await import('../plugins/testing/index.js'),
    //   await import('../plugins/docker'),
    //   await import('../plugins/eslint'),
    //   await import('../plugins/prettier'),
    //   await import('../plugins/typescript'),
    ];

    for (const mod of pluginModules) {
      const plugin: Plugin = mod.default;
      this.plugins.set(plugin.name, plugin);
    }
  }

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }
}
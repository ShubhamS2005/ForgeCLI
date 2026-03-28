import fs from "fs/promises";
import path from "path";
import { Plugin } from "../types/index.js";
import { rebuildProviderTree } from "../utils/rebuildProviiders.js";

/**
 * Handles runtime-loaded plugins (old system upgraded)
 */
export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();

  async loadPlugins(): Promise<void> {
    const pluginsDir = path.resolve(process.cwd(), "plugins");

    try {
      const pluginFolders = await fs.readdir(pluginsDir);

      for (const folder of pluginFolders) {
        const pluginEntry = path.join(pluginsDir, folder, "index.js");

        try {
          await fs.access(pluginEntry);

          const mod = await import(pluginEntry);
          const plugin: Plugin = mod.default;

          this.plugins.set(plugin.name, plugin);
        } catch {
          continue;
        }
      }
    } catch {
      // ignore
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
 * Plugin Resolver
 */
export class PluginResolver {
  async resolve(pluginName: string, projectRoot: string): Promise<string> {
    const localPath = path.join(projectRoot, ".forge", "plugins", pluginName);

    try {
      await fs.access(localPath);
      return localPath;
    } catch {
      throw new Error(
        `Plugin "${pluginName}" not found in ${path.join(projectRoot, ".forge/plugins")}`
      );
    }
  }
}

/**
 * Plugin Config Interface
 */
export interface PluginConfig {
  name: string;
  version: string;
  priority?: number;

  files?: {
    from: string;
    to: string;
  }[];

  dependencies?: string[];

  // ✅ NEW (ADD THIS)
  provider?: {
    wrapper: string;
    importName: string;
    importPath: string;
  };

  modify?: {
    file: string;
    type: "wrap" | "append" | "prepend";
    target?: string;
    with?: string;
    content?: string;
    import?: {
      name: string;
      path: string;
    };
  }[];
}

/**
 * Load plugin.json
 */
export async function loadPluginConfig(
  pluginPath: string
): Promise<PluginConfig> {
  const configPath = path.join(pluginPath, "plugin.json");

  try {
    const data = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(data);

    if (!config.name) {
      throw new Error("Plugin must have a name");
    }

    return config;
  } catch {
    throw new Error(`Invalid plugin config at ${configPath}`);
  }
}

/**
 * Copy plugin files
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

    await fs.mkdir(path.dirname(targetPath), { recursive: true });

    const isTextFile = /\.(ts|tsx|js|jsx|json|md|css|html)$/.test(sourcePath);

    if (isTextFile) {
      let content = await fs.readFile(sourcePath, "utf-8");

      content = content.replace(/\{\{(.*?)\}\}/g, (_, key) => {
        return replacements[key] || `{{${key}}}`;
      });

      try {
        await fs.access(targetPath);
        console.log(`Skipped (already exists): ${targetPath}`);
        continue;
      } catch {}

      await fs.writeFile(targetPath, content, "utf-8");
      console.log(`Created: ${targetPath}`);
    } else {
      const buffer = await fs.readFile(sourcePath);
      await fs.writeFile(targetPath, buffer);
    }
  }
}

/**
 * Apply NON-WRAP modifications only
 */
export async function applyModifications(
  projectPath: string,
  modifyRules: PluginConfig["modify"]
) {
  if (!modifyRules) return;

  for (const rule of modifyRules) {
    const filePath = path.join(projectPath, rule.file);

    try {
      let content = await fs.readFile(filePath, "utf-8");

      // =========================
      // ❌ DISABLED WRAP SYSTEM
      // =========================
      if (rule.type === "wrap") {
        console.log(
          `[SKIP] Wrap "${rule.with}" handled by rebuild system`
        );
        continue;
      }

      // =========================
      // ✅ APPEND / PREPEND ONLY
      // =========================
      if (rule.type === "append" && rule.content) {
        content += "\n" + rule.content;
        console.log(`[MODIFIED] Appended in ${rule.file}`);
      }

      if (rule.type === "prepend" && rule.content) {
        content = rule.content + "\n" + content;
        console.log(`[MODIFIED] Prepended in ${rule.file}`);
      }

      await fs.writeFile(filePath, content, "utf-8");
    } catch {
      console.log(`[ERROR] Failed modifying ${rule.file}`);
    }
  }
}

/**
 * Load ALL .forge plugins
 */
export async function loadAllForgePlugins(projectRoot: string) {
  const pluginsDir = path.join(projectRoot, ".forge", "plugins");

  let folders: string[] = [];

  try {
    folders = await fs.readdir(pluginsDir);
  } catch {
    console.log("[INFO] No .forge plugins found");
    return [];
  }

  const plugins: { config: PluginConfig; path: string }[] = [];

  for (const folder of folders) {
    const pluginPath = path.join(pluginsDir, folder);

    try {
      const config = await loadPluginConfig(pluginPath);

      plugins.push({
        config: {
          ...config,
          priority: config.priority ?? 0,
        },
        path: pluginPath,
      });
    } catch {
      console.log(`[WARN] Skipping invalid plugin: ${folder}`);
    }
  }

  plugins.sort((a, b) => (a.config.priority || 0) - (b.config.priority || 0));

  return plugins;
}

/**
 * Apply ALL plugins
 */
export async function applyAllPlugins(projectPath: string) {
  const plugins = await loadAllForgePlugins(projectPath);

  if (plugins.length === 0) {
    console.log("[INFO] No plugins to apply");
    return;
  }

  console.log("\n🔌 Applying plugins (priority order):\n");

  for (const { config, path: pluginPath } of plugins) {
    console.log(`→ ${config.name} (priority: ${config.priority})`);

    const replacements = {
      APP_NAME: path.basename(projectPath),
    };

    if (config.files) {
      await copyPluginFiles(
        pluginPath,
        projectPath,
        config.files,
        replacements
      );
    }

    await applyModifications(projectPath, config.modify);
  }

  // =========================
  // 🔥 FINAL REBUILD (ONLY SOURCE OF JSX)
  // =========================
  const mainFile = path.join(projectPath, "src/main.tsx");

  try {
    const content = await fs.readFile(mainFile, "utf-8");

    const updated = rebuildProviderTree(
      content,
      plugins.map((p) => p.config)
    );

    if (updated !== content) {
      await fs.writeFile(mainFile, updated, "utf-8");
      console.log("[REBUILD] Provider tree updated with priority");
    } else {
      console.log("[REBUILD] No changes needed");
    }
  } catch {
    console.log("[ERROR] Failed rebuilding provider tree");
  }

  console.log("\n✅ All plugins applied successfully!");
}
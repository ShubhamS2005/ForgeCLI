import fs from "fs/promises";
import path from "path";
import { Plugin } from "../types/index.js";

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
    const localPath = path.join(projectRoot, ".forge", "plugins", pluginName);

    try {
      await fs.access(localPath);
      return localPath;
    } catch {
      throw new Error(
        `Plugin "${pluginName}" not found in ${path.join(projectRoot, ".forge/plugins")}`,
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
 * 🔥 Load plugin.json
 */
export async function loadPluginConfig(
  pluginPath: string,
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
 * 🔥 Copy plugin files into project
 */
export async function copyPluginFiles(
  pluginPath: string,
  projectPath: string,
  files: { from: string; to: string }[],
  replacements: Record<string, string> = {},
) {
  for (const file of files) {
    const sourcePath = path.join(pluginPath, file.from);
    const targetPath = path.join(projectPath, file.to);

    // ensure target directory exists
    await fs.mkdir(path.dirname(targetPath), { recursive: true });

    const isTextFile = /\.(ts|tsx|js|jsx|json|md|css|html)$/.test(sourcePath);

    if (isTextFile) {
      let content = await fs.readFile(sourcePath, "utf-8");

      // 🔥 placeholder replacement
      content = content.replace(/\{\{(.*?)\}\}/g, (_, key) => {
        return replacements[key] || `{{${key}}}`;
      });

      await fs.writeFile(targetPath, content, "utf-8");
    } else {
      const buffer = await fs.readFile(sourcePath);
      await fs.writeFile(targetPath, buffer);
    }

    console.log(`Created: ${targetPath}`);
  }
}

export async function applyModifications(
  projectPath: string,
  modifyRules: PluginConfig["modify"],
) {
  if (!modifyRules) return;

  for (const rule of modifyRules) {
    const filePath = path.join(projectPath, rule.file);

    try {
      let content = await fs.readFile(filePath, "utf-8");

      // =========================
      //  IMPORT INJECTION
      // =========================
      if (rule.import) {
        const importStatement = `import { ${rule.import.name} } from "${rule.import.path}";`;

        if (!content.includes(importStatement)) {
          // insert after last import
          const importRegex = /(import .* from .*;\n)/g;

          let lastImport;
          let match;

          while ((match = importRegex.exec(content)) !== null) {
            lastImport = match;
          }

          if (lastImport) {
            const insertPos = lastImport.index + lastImport[0].length;
            content =
              content.slice(0, insertPos) +
              importStatement +
              "\n" +
              content.slice(insertPos);
          } else {
            content = importStatement + "\n" + content;
          }

          console.log(`[MODIFIED] Added import in ${rule.file}`);
        }
      }

      // =========================
      //  WRAP
      // =========================
      if (rule.type === "wrap" && rule.with) {
        const appRegex = /<App\b[^>]*\/>/;
        const alreadyWrappedRegex = new RegExp(
          `<${rule.with}>[\\s\\S]*<App\\b[^>]*\\/>[\\s\\S]*<\\/${rule.with}>`,
        );

        if (alreadyWrappedRegex.test(content)) {
          console.log(`[SKIP] Already wrapped in ${rule.with}`);
        } else {
          const match = content.match(appRegex);

          if (!match) {
            console.log(`[WARN] Target not found in ${rule.file}`);
            continue;
          }

          const original = match[0];

          const wrapped = `<${rule.with}>
  ${original}
</${rule.with}>`;

          content = content.replace(appRegex, wrapped);

          console.log(`[MODIFIED] Wrapped App in ${rule.file}`);
        }
      }

      await fs.writeFile(filePath, content, "utf-8");
    } catch (err) {
      console.log(`[ERROR] Failed modifying ${rule.file}`);
    }
  }
}

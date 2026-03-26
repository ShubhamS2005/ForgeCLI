import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Install a plugin from CLI into the project `.forge/plugins/` folder
 * Works in both development and built CLI modes
 */
export async function installPlugin(pluginName: string) {
  const root = process.cwd(); // Project root (e.g., myApp2)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // CLI root (dist/commands or src/commands)
  const cliRoot = path.resolve(__dirname, "../../");

  // Possible plugin paths: built and dev
  const possiblePaths = [
    path.join(cliRoot, "plugins", pluginName),          // built CLI -> dist/plugins
    path.join(cliRoot, "../plugins", pluginName),  // dev CLI -> src/plugins
  ];

  let sourcePath: string | undefined;

  // Find first existing path
  for (const p of possiblePaths) {
    try {
      await fs.access(p);
      sourcePath = p;
      break;
    } catch {}
  }

  if (!sourcePath) {
    console.log(
      `[ERROR] Plugin "${pluginName}" not found in CLI plugins. Checked paths:\n` +
      possiblePaths.map(p => `  - ${p}`).join("\n")
    );
    return;
  }

  const targetPath = path.join(root, ".forge", "plugins", pluginName);

  // ✅ Create target directory
  await fs.mkdir(targetPath, { recursive: true });

  // ✅ Copy plugin files
  await copyDir(sourcePath, targetPath);

  console.log(`[SUCCESS] Installed plugin "${pluginName}" from ${sourcePath}`);
}

// 🔥 Recursive helper to copy directories
async function copyDir(src: string, dest: string) {
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await fs.mkdir(destPath, { recursive: true });
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}
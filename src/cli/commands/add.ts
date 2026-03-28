import { Command } from "commander";
import inquirer from "inquirer";
import path from "path";

import { FileManager } from "../../core/file-manager.js";
import {
  PluginManager,
  PluginResolver,
  loadPluginConfig,
  copyPluginFiles,
  applyModifications,
  applyAllPlugins,
} from "../../core/plugin-manager.js";
import { RemotePluginLoader } from "../../core/remote-plugin-loader.js";
import { logger } from "../../utils/logger.js";
import { handleError, AppError } from "../../utils/error-handler.js";

export const addCommand = new Command("add")
  .description("Add a feature to existing project")
  .argument("[feature]", "Feature to add")
  .option("-p, --project-path <path>", "Project path", ".")
  .option("--from <source>", "Remote plugin source (e.g. github:user/repo)")
  .action(
    async (
      feature: string | undefined,
      options: { projectPath: string; from?: string },
    ) => {
      try {
        const fileManager = new FileManager();
        const pluginManager = new PluginManager();
        const resolver = new PluginResolver();
        const remoteLoader = new RemotePluginLoader();

        const projectPath = path.resolve(options.projectPath);

        // ✅ Validate project
        const packageJsonPath = path.join(projectPath, "package.json");
        if (!(await fileManager.exists(packageJsonPath))) {
          throw new AppError("Not a valid Node.js project", "INVALID_PROJECT");
        }

        // ============================
        // 🔥 REMOTE PLUGIN FLOW
        // ============================

        if (options.from) {
          if (!feature) {
            throw new AppError(
              "Feature name required for remote plugin",
              "INVALID_FEATURE",
            );
          }

          if (!options.from.startsWith("github:")) {
            throw new AppError(
              "Only github source supported (github:user/repo)",
              "INVALID_SOURCE",
            );
          }

          const repo = options.from.replace("github:", "");
          const plugin = await remoteLoader.loadFromGitHub(repo);

          await plugin.apply(projectPath);

          logger.success(`Remote plugin "${plugin.name}" added!`);
          return;
        }

        // 🔥 Support: forge add github:user/repo
        if (feature && feature.startsWith("github:")) {
          options.from = feature;
          feature = undefined;
        }

        // ============================
        // 🆕 NEW SYSTEM (.forge plugins)
        // ============================

        if (feature) {
          try {
            // 🔥 Step 1: Validate plugin exists
            const pluginPath = await resolver.resolve(feature, projectPath);
            const pluginConfig = await loadPluginConfig(pluginPath);

            logger.info(`Adding plugin: ${pluginConfig.name}`);

            // 🔥 Step 2: Apply ALL plugins in priority order
            await applyAllPlugins(projectPath);

            logger.success(
              `Plugin "${pluginConfig.name}" applied with priority system`,
            );

            return;
          } catch (err: any) {
            logger.error(`Local plugin failed: ${err.message}`);
            return; // ❗ STOP here
          }
        }

        // ============================
        // 🟡 OLD SYSTEM (fallback)
        // ============================

        await pluginManager.loadPlugins();
        const plugins = pluginManager.getAllPlugins();

        if (!feature) {
          const { selected } = await inquirer.prompt([
            {
              type: "list",
              name: "selected",
              message: "Select a feature to add:",
              choices: plugins.map((p) => ({
                name: `${p.name} - ${p.description}`,
                value: p.name,
              })),
            },
          ]);

          feature = selected;
        }

        const finalFeature = feature;

        if (!finalFeature) {
          throw new AppError("Feature is required", "INVALID_FEATURE");
        }

        const plugin = pluginManager.getPlugin(finalFeature);

        if (!plugin) {
          throw new AppError(
            `Feature "${finalFeature}" not found`,
            "INVALID_FEATURE",
          );
        }

        await plugin.apply(projectPath);

        logger.success(`Plugin "${finalFeature}" added successfully`);
      } catch (error) {
        handleError(error);
      }
    },
  );

import { Command } from 'commander';
import inquirer from 'inquirer';
import path from 'path';
import { Dirent } from 'fs';

import { TemplateEngine } from '../../core/template-engine';
import { FileManager } from '../../core/file-manager';
import { logger } from '../../utils/logger';
import { handleError, AppError } from '../../utils/error-handler';

export const createCommand = new Command('create')
  .description('Create a new application from a template')
  .argument('[app-name]', 'Name of the application') // ✅ optional
  .option('-t, --template <template>', 'Template to use')
  .option('-d, --directory <dir>', 'Target directory', '.')
  .action(
    async (
      appName: string | undefined,
      options: { template?: string; directory: string }
    ) => {
      try {
        const templateEngine = new TemplateEngine();
        const fileManager = new FileManager();

        // ✅ 1. Ask for app name if not provided
        if (!appName) {
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'appName',
              message: 'Enter app name:',
              validate: (input) =>
                /^[a-zA-Z0-9-_]+$/.test(input)
                  ? true
                  : 'Invalid app name',
            },
          ]);

          appName = answers.appName;
        }

        // ✅ 2. Final type-safe variables
        const finalAppName = appName;

        if (!finalAppName) {
          throw new AppError('App name is required', 'INVALID_NAME');
        }

        // ✅ 3. Validate app name
        if (!/^[a-zA-Z0-9-_]+$/.test(finalAppName)) {
          throw new AppError(
            'App name can only contain letters, numbers, hyphens, and underscores',
            'INVALID_NAME'
          );
        }

        // ✅ 4. Get templates
        const templates = await getAvailableTemplates();

        // ✅ 5. Ask for template if missing/invalid
        if (!options.template || !templates.includes(options.template)) {
          const { selectedTemplate } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedTemplate',
              message: 'Select a template:',
              choices: templates,
            },
          ]);

          options.template = selectedTemplate;
        }

        const finalTemplate = options.template;

        if (!finalTemplate) {
          throw new AppError('Template is required', 'INVALID_TEMPLATE');
        }

        // ✅ 6. Compute target directory
        const targetDir = path.resolve(options.directory, finalAppName);

        // ✅ 7. Check if directory exists
        if (await fileManager.exists(targetDir)) {
          throw new AppError(
            `Directory ${targetDir} already exists`,
            'DIRECTORY_EXISTS'
          );
        }

        // ✅ 8. Load template config
        const config = await templateEngine.loadTemplateConfig(
          finalTemplate
        );

        let selectedFeatures: string[] = [];

        // ✅ 9. Feature selection
        if (config.features && config.features.length > 0) {
          const { features } = await inquirer.prompt([
            {
              type: 'checkbox',
              name: 'features',
              message: 'Select additional features:',
              choices: config.features,
            },
          ]);

          selectedFeatures = features;
        }

        // ✅ 10. Confirmation
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Create ${finalAppName} in ${targetDir}?`,
            default: true,
          },
        ]);

        if (!confirm) {
          logger.info('Operation cancelled');
          return;
        }

        // ✅ 11. Scaffold project
        await templateEngine.scaffold({
          appName: finalAppName,
          template: finalTemplate,
          features: selectedFeatures,
          targetDir,
        });

        // ✅ 12. Next steps
        logger.info('\nNext steps:');
        console.log(`  cd ${finalAppName}`);
        console.log('  npm install');
        console.log('  npm run dev\n');

      } catch (error) {
        handleError(error);
      }
    }
  );

/**
 * Get available templates
 */
async function getAvailableTemplates(): Promise<string[]> {
  const templatesDir = path.join(process.cwd(), 'templates');
  const fileManager = new FileManager();

  try {
    const entries = (await fileManager.readdir(
      templatesDir
    )) as Dirent[];

    return entries
      .filter((entry: Dirent) => entry.isDirectory())
      .map((dir: Dirent) => dir.name);
  } catch {
    return ['react-app', 'express-api', 'node-module'];
  }
}
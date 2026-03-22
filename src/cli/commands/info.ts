import { Command } from 'commander';

import { TemplateEngine } from '../../core/template-engine';
import { logger } from '../../utils/logger';
import { handleError, AppError } from '../../utils/error-handler';

export const infoCommand = new Command('info')
  .description('Show detailed information about a template')
  .argument('<template>', 'Template name')
  .action(async (templateName: string) => {
    try {
      const templateEngine = new TemplateEngine();

      const isValid = await templateEngine.validateTemplate(templateName);

      if (!isValid) {
        throw new AppError(
          `Template "${templateName}" not found`,
          'TEMPLATE_NOT_FOUND'
        );
      }

      const config = await templateEngine.loadTemplateConfig(templateName);

      logger.info(`\n📦 Template: ${config.name}\n`);

    

      // Placeholders
      console.log('\n🔧 Placeholders:');
      if (config.placeholders && Object.keys(config.placeholders).length > 0) {
        Object.entries(config.placeholders).forEach(([key, value]) => {
          console.log(`  - ${key}: ${value}`);
        });
      } else {
        console.log('  None');
      }

      // Features
      console.log('\n✨ Features:');
      if (config.features && config.features.length > 0) {
        config.features.forEach((feature: string) => {
          console.log(`  - ${feature}`);
        });
      } else {
        console.log('  None');
      }

      // Hook
      if (config.postInstall && config.postInstall.trim() !== '') {
          console.log('\n⚙️ Post Install Script:');
          console.log(`  ${config.postInstall}`);
        }
      console.log('');
    } catch (error) {
      handleError(error);
    }
  });
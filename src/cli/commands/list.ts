import { Command } from 'commander';
import path from 'path';

import { TemplateEngine } from '../../core/template-engine';
import { logger } from '../../utils/logger';
import { handleError } from '../../utils/error-handler';

export const listCommand = new Command('list')
  .description('List all available templates')
  .action(async () => {
    try {
      const templateEngine = new TemplateEngine();

      const templates = await templateEngine.getAvailableTemplates();

      if (templates.length === 0) {
        logger.warn('No templates found.');
        return;
      }

      logger.info('\nAvailable Templates:\n');

      for (const template of templates) {
        try {
          const config = await templateEngine.loadTemplateConfig(template);

          console.log(`🔹 ${config.name}`);
          console.log(`   Description: ${config.description || 'N/A'}`);

          if (config.features && config.features.length > 0) {
            console.log(`   Features: ${config.features.join(', ')}`);
          }

          console.log('');
        } catch {
          console.log(`🔹 ${template} (invalid config)\n`);
        }
      }
    } catch (error) {
      handleError(error);
    }
  });
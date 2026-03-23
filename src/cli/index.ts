import { Command } from 'commander';
import { createCommand } from './commands/create.js';
import { addCommand } from './commands/add.js';
import { logger } from '../utils/logger.js';
import { handleError } from '../utils/error-handler.js';
import { listCommand } from './commands/list.js';
import { infoCommand } from './commands/info.js';

// Create main program
const program = new Command();

// Configure program metadata
program
  .name('forgecli')
  .description('Production-quality application scaffolding CLI tool')
  .version('1.0.0');

// Register commands
program.addCommand(createCommand);
program.addCommand(addCommand);
program.addCommand(listCommand);
program.addCommand(infoCommand);

// Global error handling
program.exitOverride();

try {
  program.parse(process.argv);
} catch (error) {
  handleError(error);
}

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
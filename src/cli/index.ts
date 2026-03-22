import { Command } from 'commander';
import { createCommand } from './commands/create';
import { addCommand } from './commands/add';
import { logger } from '../utils/logger';
import { handleError } from '../utils/error-handler';
import { listCommand } from './commands/list';
import { infoCommand } from './commands/info';

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
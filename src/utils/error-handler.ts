import { logger } from './logger.js';

export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN_ERROR',
    public exitCode: number = 1
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleError(error: unknown): never {
  if (error instanceof AppError) {
    logger.error(error.message);
    process.exit(error.exitCode);
  }
  
  if (error instanceof Error) {
    logger.error(error.message);
    process.exit(1);
  }
  
  logger.error('An unexpected error occurred');
  process.exit(1);
}
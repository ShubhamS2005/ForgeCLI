import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';
import { Dirent } from 'fs';

export class FileManager {
  /**
   * Create directory recursively
   */
  async createDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      logger.debug(`Created directory: ${dirPath}`);
    } catch (error) {
      throw new Error(`Failed to create directory: ${dirPath}`);
    }
  }

  /**
   * Write file with directory creation
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    
    // Ensure directory exists
    await this.createDirectory(dir);
    
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Read file with error handling
   */
  async readFile(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
    try {
      return await fs.readFile(filePath, encoding);
    } catch (error) {
      throw new Error(`Failed to read file: ${filePath}`);
    }
  }

  /**
   * Check if path exists
   */
  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get directory contents
   */
  async readdir(dirPath: string): Promise<Dirent[]> {
    return await fs.readdir(dirPath, { withFileTypes: true });
  }
}
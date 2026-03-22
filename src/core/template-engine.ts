import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { TemplateConfig, ScaffoldOptions } from '../types';
import { FileManager } from './file-manager';
import { logger } from '../utils/logger';

export interface ReplacementMap {
  [key: string]: string;
}

export class TemplateEngine {
  private fileManager: FileManager;
  private templatesDir: string;

  constructor(templatesDir: string = path.resolve(process.cwd(), 'templates')) {
    this.fileManager = new FileManager();
    this.templatesDir = templatesDir;
  }

  /**
   * Load template configuration
   */
  async loadTemplateConfig(templateName: string): Promise<TemplateConfig> {
    const configPath = path.join(this.templatesDir, templateName, 'forgecli.json');

    try {
      const configData = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configData);

      if (!config.name) {
        throw new Error('Template must have a name');
      }

      return config;
    } catch {
      throw new Error(
        `Template "${templateName}" not found or invalid. Make sure forgecli.json exists.`
      );
    }
  }

  /**
   * Get all templates
   */
  async getAvailableTemplates(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.templatesDir, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort();
    } catch {
      return [];
    }
  }

  /**
   * Main scaffolding method
   */
  async scaffold(options: ScaffoldOptions): Promise<void> {
    const { appName, template, targetDir } = options;

    logger.info(`Scaffolding ${appName} using ${template} template...`);

    await this.fileManager.createDirectory(targetDir);

    const config = await this.loadTemplateConfig(template);
    const templateDir = path.join(this.templatesDir, template);

    const replacementMap: ReplacementMap = {
      APP_NAME: appName,
      CURRENT_YEAR: new Date().getFullYear().toString(),
      AUTHOR: process.env.USER || process.env.USERNAME || 'Developer',
      ...options.replacements
    };

    await this.processTemplateDirectory(templateDir, targetDir, replacementMap);

    // ✅ Auto install dependencies
    try {
      logger.info('Installing dependencies...');
      execSync('npm install', {
        cwd: targetDir,
        stdio: 'inherit'
      });
    } catch {
      logger.warn('npm install failed. Run it manually.');
    }

    logger.success(`Successfully created ${appName}!`);
  }

  /**
   * Process directory recursively
   */
  private async processTemplateDirectory(
    sourceDir: string,
    targetDir: string,
    replacementMap: ReplacementMap
  ): Promise<void> {
    const entries = await fs.readdir(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
      // ✅ Ignore unwanted folders
      if (['node_modules', '.git'].includes(entry.name)) continue;

      const sourcePath = path.join(sourceDir, entry.name);

      if (entry.name === 'forgecli.json') continue;

      if (entry.isDirectory()) {
        const newTargetDir = path.join(targetDir, entry.name);
        await this.fileManager.createDirectory(newTargetDir);
        await this.processTemplateDirectory(sourcePath, newTargetDir, replacementMap);
      } else {
        await this.processTemplateFile(sourcePath, targetDir, replacementMap);
      }
    }
  }

  /**
   * Process file (supports binary + text)
   */
  private async processTemplateFile(
    sourcePath: string,
    targetDir: string,
    replacementMap: ReplacementMap
  ): Promise<void> {
    let fileName = path.basename(sourcePath);

    // ✅ Handle gitignore
    if (fileName === 'gitignore') fileName = '.gitignore';

    fileName = this.replacePlaceholders(fileName, replacementMap);
    const targetPath = path.join(targetDir, fileName);

    const isTextFile = /\.(ts|js|json|html|css|md|txt|tsx|jsx)$/.test(sourcePath);

    if (isTextFile) {
      let content = await fs.readFile(sourcePath, 'utf-8');
      content = this.replacePlaceholders(content, replacementMap);
      await this.fileManager.writeFile(targetPath, content);
    } else {
      const buffer = await fs.readFile(sourcePath);
      await fs.writeFile(targetPath, buffer);
    }

    logger.debug(`Created: ${targetPath}`);
  }

  /**
   * Replace placeholders
   */
  private replacePlaceholders(
    content: string,
    replacementMap: ReplacementMap
  ): string {
    return content.replace(/\{\{(.*?)\}\}/g, (_, key) => {
      return replacementMap[key] !== undefined ? replacementMap[key] : `{{${key}}}`;
    });
  }

  /**
   * Add file to project
   */
  async addFile(
    templateName: string,
    filePath: string,
    targetPath: string,
    replacements: ReplacementMap = {}
  ): Promise<void> {
    const templateDir = path.join(this.templatesDir, templateName);
    const sourcePath = path.join(templateDir, filePath);

    try {
      await fs.access(sourcePath);
    } catch {
      throw new Error(`Template file not found: ${filePath}`);
    }

    const isTextFile = /\.(ts|js|json|html|css|md|txt|tsx|jsx)$/.test(sourcePath);

    if (isTextFile) {
      let content = await fs.readFile(sourcePath, 'utf-8');
      content = this.replacePlaceholders(content, replacements);
      await this.fileManager.writeFile(targetPath, content);
    } else {
      const buffer = await fs.readFile(sourcePath);
      await fs.writeFile(targetPath, buffer);
    }

    logger.debug(`Added file: ${path.basename(targetPath)}`);
  }

  /**
   * Validate template
   */
  async validateTemplate(templateName: string): Promise<boolean> {
    try {
      const templateDir = path.join(this.templatesDir, templateName);
      await fs.access(templateDir);

      await this.loadTemplateConfig(templateName);

      return true;
    } catch {
      return false;
    }
  }
}
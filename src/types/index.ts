export interface TemplateConfig {
  name: string;
  description?: string;
  version?: string;
  placeholders?: Record<string, string>;
  features?: string[];
    postInstall?: string;
}

export interface ScaffoldOptions {
  appName: string;
  template: string;
  targetDir: string;
  replacements?: Record<string, string>;
  features?: string[];
}

export interface FileMapping {
  source: string;
  destination: string;
  isTemplate: boolean;
}

export interface Plugin {
  name: string;
  description: string;
  apply(projectPath: string): Promise<void>;
}
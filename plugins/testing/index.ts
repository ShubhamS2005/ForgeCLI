import path from 'path';
import { Plugin } from '../../src/types/index.js';
import { FileManager } from '../../src/core/file-manager.js';

const plugin: Plugin = {
  name: 'testing',
  description: 'Add Jest testing setup',

  async apply(projectPath: string) {
    const fileManager = new FileManager();

    const jestConfig = {
      testEnvironment: 'node',
      coverageDirectory: 'coverage',
    };

    await fileManager.writeFile(
      path.join(projectPath, 'jest.config.json'),
      JSON.stringify(jestConfig, null, 2)
    );

    const pkgPath = path.join(projectPath, 'package.json');
    const pkg = JSON.parse(await fileManager.readFile(pkgPath, 'utf-8'));

    pkg.scripts = {
      ...pkg.scripts,
      test: 'jest',
    };

    pkg.devDependencies = {
      ...pkg.devDependencies,
      jest: '^29.0.0',
    };

    await fileManager.writeFile(pkgPath, JSON.stringify(pkg, null, 2));
  },
};

export default plugin;
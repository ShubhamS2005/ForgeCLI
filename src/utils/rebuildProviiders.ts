import { parse } from "@babel/parser";
import traverseModule, { NodePath } from "@babel/traverse";
import generateModule from "@babel/generator";
import * as t from "@babel/types";

const traverse = (traverseModule as any).default || traverseModule;
const generate = (generateModule as any).default || generateModule;

function getJSXName(node: any): string {
  if (t.isJSXIdentifier(node)) return node.name;
  if (t.isJSXMemberExpression(node)) {
    return `${getJSXName(node.object)}.${getJSXName(node.property)}`;
  }
  return "";
}

function extractPureApp(node: t.JSXElement): t.JSXElement | null {
  let current: t.JSXElement = node;

  while (true) {
    const children = current.children.filter((c) =>
      t.isJSXElement(c),
    ) as t.JSXElement[];

    if (children.length !== 1) break;

    const child = children[0];
    const name = getJSXName(child.openingElement.name);

    if (name === "App") {
      return child;
    }

    current = child;
  }

  return null;
}

export function rebuildProviderTree(content: string, pluginConfigs: any[]) {
  const ast = parse(content, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  let rootNode: t.JSXElement | null = null;

  // ✅ FIXED: detect StrictMode properly
  traverse(ast, {
    JSXElement(path: NodePath<t.JSXElement>) {
      const name = getJSXName(path.node.openingElement.name);

      if (name === "StrictMode" || name === "React.StrictMode") {
        rootNode = path.node;
        path.stop();
      }
    },
  });

  if (!rootNode) {
    console.log("[REBUILD] StrictMode not found");
    return content;
  }

  const appNode = extractPureApp(rootNode);
  if (!appNode) {
    console.log("[REBUILD] App not found");
    return content;
  }

  const providers = pluginConfigs
    .filter((p) => p.provider)
    .map((p) => ({
      wrapper: p.provider.wrapper,
      importName: p.provider.importName,
      importPath: p.provider.importPath,
      priority: p.priority || 0,
    }));

  if (providers.length === 0) {
    console.log("[REBUILD] No providers found");
    return content;
  }

  // ✅ FIXED: correct priority order
  providers.sort((a, b) => a.priority - b.priority);

  console.log("[DEBUG] Providers after sort:", providers);

  let newTree: t.JSXElement = appNode;

  for (let i = providers.length - 1; i >= 0; i--) {
  const p = providers[i];

  newTree = t.jsxElement(
    t.jsxOpeningElement(t.jsxIdentifier(p.wrapper), [], false),
    t.jsxClosingElement(t.jsxIdentifier(p.wrapper)),
    [newTree],
    false,
  );
}

  // ✅ Replace tree
  traverse(ast, {
    JSXElement(path: NodePath<t.JSXElement>) {
      const name = getJSXName(path.node.openingElement.name);

      if (name === "StrictMode" || name === "React.StrictMode") {
        path.node.children = [
          t.jsxText("\n    "),
          newTree,
          t.jsxText("\n  "),
        ];
        path.stop();
      }
    },
  });

  // ✅ Ensure imports
  const existing = new Set<string>();

  traverse(ast, {
    ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
      existing.add(path.node.source.value);
    },
  });

  for (const p of providers) {
    if (!existing.has(p.importPath)) {
      ast.program.body.unshift(
        t.importDeclaration(
          [
            t.importSpecifier(
              t.identifier(p.importName),
              t.identifier(p.importName),
            ),
          ],
          t.stringLiteral(p.importPath),
        ),
      );
    }
  }

  console.log("[REBUILD] Provider tree rebuilt");

  return generate(ast, {}, content).code;
}
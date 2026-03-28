import { parse } from "@babel/parser";
import traverseModule, { NodePath } from "@babel/traverse";
import generateModule from "@babel/generator";
import * as t from "@babel/types";
import { ImportDeclaration, JSXElement } from "@babel/types";

const traverse = (traverseModule as any).default || traverseModule;
const generate = (generateModule as any).default || generateModule;

// ✅ Get JSX name safely
function getJSXName(node: any): string {
  if (t.isJSXIdentifier(node)) {
    return node.name;
  }

  if (t.isJSXMemberExpression(node)) {
    return `${getJSXName(node.object)}.${getJSXName(node.property)}`;
  }

  return "";
}

// ✅ Clean target like "<App />" → "App"
function cleanTargetName(target: string): string {
  return target.replace(/[<>\/\s]/g, "");
}

// ✅ GLOBAL duplicate check
function hasWrapperGlobal(ast: any, wrapper: string): boolean {
  let found = false;

  traverse(ast, {
    JSXElement(path: NodePath<JSXElement>) {
      const name = getJSXName(path.node.openingElement.name);
      if (name === wrapper) {
        found = true;
        path.stop();
      }
    },
  });

  return found;
}

export function modifyReactFile(
  content: string,
  options: {
    wrapper: string;
    importName: string;
    importPath: string;
    target: string;
  },
) {
  const { wrapper, importName, importPath, target } = options;

  const ast = parse(content, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  const cleanTarget = cleanTargetName(target);

  let hasImport = false;
  let wrapped = false;

  // ✅ 1. Prevent duplicate wrapping
  if (hasWrapperGlobal(ast, wrapper)) {
    return content;
  }

  // ✅ 2. Check import
  traverse(ast, {
    ImportDeclaration(path: NodePath<ImportDeclaration>) {
      if (path.node.source.value === importPath) {
        hasImport = true;
      }
    },
  });

  // ✅ 3. Wrap ONLY target (<App />)
  traverse(ast, {
    JSXElement(path: NodePath<JSXElement>) {
      const name = getJSXName(path.node.openingElement.name);

      if (name === cleanTarget) {
        const wrappedNode = t.jsxElement(
          t.jsxOpeningElement(t.jsxIdentifier(wrapper), [], false),
          t.jsxClosingElement(t.jsxIdentifier(wrapper)),
          [path.node],
          false,
        );

        path.replaceWith(wrappedNode);
        wrapped = true;

        path.stop();
      }
    },
  });

  // ❌ If target not found → no change
  if (!wrapped) {
    return content;
  }

  // ✅ 4. Add import if missing
  if (!hasImport) {
    const importDecl = t.importDeclaration(
      [t.importSpecifier(t.identifier(importName), t.identifier(importName))],
      t.stringLiteral(importPath),
    );

    ast.program.body.unshift(importDecl);
  }

  // ✅ 5. Generate final code
  return generate(ast, {}, content).code;
}
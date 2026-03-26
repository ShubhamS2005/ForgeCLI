import { parse } from "@babel/parser";
import traverseModule, { NodePath } from "@babel/traverse";
import generateModule from "@babel/generator";
import * as t from "@babel/types";
import { ImportDeclaration, JSXElement } from "@babel/types";

const traverse = (traverseModule as any).default || traverseModule;
const generate = (generateModule as any).default || generateModule;

export function modifyReactFile(
  content: string,
  providerName: string,
  importPath: string
) {
  const ast = parse(content, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  let hasImport = false;
  let isWrapped = false;

  traverse(ast, {
    ImportDeclaration(path: NodePath<ImportDeclaration>) {
      if (path.node.source.value === importPath) {
        hasImport = true;
      }
    },

    JSXElement(path: NodePath<JSXElement>) {
      const opening = path.node.openingElement;

      if (
        t.isJSXIdentifier(opening.name) &&
        opening.name.name === providerName
      ) {
        isWrapped = true;
      }

      if (
        t.isJSXIdentifier(opening.name) &&
        opening.name.name === "App"
      ) {
        if (!isWrapped) {
          const wrapped = t.jsxElement(
            t.jsxOpeningElement(t.jsxIdentifier(providerName), [], false),
            t.jsxClosingElement(t.jsxIdentifier(providerName)),
            [path.node],
            false
          );

          path.replaceWith(wrapped);
          isWrapped = true;
        }
      }
    },
  });

  if (!hasImport) {
    const importDecl = t.importDeclaration(
      [
        t.importSpecifier(
          t.identifier(providerName),
          t.identifier(providerName)
        ),
      ],
      t.stringLiteral(importPath)
    );

    ast.program.body.unshift(importDecl);
  }

  const output = generate(ast, {}, content);

  return output.code;
}
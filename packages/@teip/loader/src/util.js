/* @flow */
import { type DocumentNode, type FragmentSpreadNode, type DefinitionNode, visit } from 'graphql';

export const importRegex = /^#\s*import\s*{\s*((?:[_A-Za-z][_0-9A-Za-z]*\s*,\s*)*)([_A-Za-z][_0-9A-Za-z]*)\s*}\s*from\s*("[^"]+"|'[^']+')\s*$/;

export function transformImport(imp: string): string {
  const matches = imp.match(importRegex);
  if (!matches) {
    throw new Error(`The provided import does not match an import statement!`);
  }
  const source = matches[3];
  const imports: string[] = [matches[2]];
  if (matches[1]) {
    const identifiers = matches[1]
      .trim()
      .substr(0, matches[1].trim().length - 1)
      .split(',');
    imports.unshift(...identifiers.map(str => str.trim()));
  }
  const importedIdentifiers = imports.map(imp => imp + 'Fragment').join(', ');
  return 'import { ' + importedIdentifiers + ' } from ' + source + ';';
}

export function joinDocuments(...documents: Object[]) {
  var definitions, i, k;
  definitions = [];
  for (i = 0; i < documents.length; i++) {
    for (k = 0; k < documents[i].definitions.length; k++) {
      if (!definitions.some(def => def === documents[i].definitions[k])) {
        definitions.push(documents[i].definitions[k]);
      }
    }
  }
  return {
    kind: 'Document',
    definitions,
  };
}

export function findFragmentReferences(ast: DocumentNode) {
  const names = [];

  visit(ast, {
    enter: {
      FragmentSpread(node: FragmentSpreadNode) {
        names.push(node.name.value);
      },
    },
  });

  return names;
}

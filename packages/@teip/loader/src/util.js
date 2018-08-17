/* @flow */
import { type DocumentNode, type FragmentSpreadNode, type DefinitionNode, visit } from 'graphql';
import { isImport, importToImportInfo } from '@teip/utils';

export function transformToImport(imp: string): string {
  const { names, path } = importToImportInfo(imp);
  const importedIdentifiers = names.map(name => name + 'Fragment').join(', ');
  return 'import { ' + importedIdentifiers + " } from '" + path + "';";
}

export function transformToRequire(imp: string): string {
  const { names, path } = importToImportInfo(imp);
  const importedIdentifiers = names.map(name => name + 'Fragment').join(', ');
  return 'const { ' + importedIdentifiers + " } = require('" + path + "');";
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

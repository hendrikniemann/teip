/* @flow */
import { type DefinitionNode } from 'graphql';

export function definitionToVariableName(definition: DefinitionNode): string {
  if (definition.kind === 'OperationDefinition') {
    if (!definition.name) {
      throw new Error('Definitions without a name cannot be turned into a variable name.');
    }
    if (definition.operation === 'query') {
      return definition.name.value + 'Query';
    } else if (definition.operation === 'mutation') {
      return definition.name.value + 'Mutation';
    } else if (definition.operation === 'subscription') {
      return definition.name.value + 'Subscription';
    }
    throw new Error(
      `Unknown operation type ${definition.operation} cannot be turned into variable name.`,
    );
  }
  if (definition.kind === 'FragmentDefinition') {
    return definition.name.value + 'Fragment';
  }
  throw new Error(
    'Only fragment definitions and operation definitions can be turned into a variable name.',
  );
}

export function definitionToTypeName(definition: DefinitionNode): string {
  return definitionToVariableName(definition) + 'Type';
}

export const importRegex = /^#\s*import\s*{\s*((?:[_A-Za-z][_0-9A-Za-z]*\s*,\s*)*)([_A-Za-z][_0-9A-Za-z]*)\s*}\s*from\s*("[^"]+"|'[^']+')\s*$/;

export const isImport = (str: string): boolean => importRegex.test(str);

type ImportInfo = {
  path: string,
  names: string[],
};

export function importToImportInfo(line: string): ImportInfo {
  const match = line.match(importRegex);
  if (!match) {
    throw new Error('Line passed as the argument does not match the import regex');
  }
  const names = [match[2]];
  names.unshift(
    ...match[1]
      .trim()
      .substr(0, match[1].trim().length - 1)
      .split(',')
      .map(str => str.trim()),
  );
  return {
    path: match[3].substring(1, match[3].length - 1),
    names,
  };
}

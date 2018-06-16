/* @flow */
import * as fs from 'fs';
import * as path from 'path';
import {
  type DocumentNode,
  type SelectionSetNode,
  parse,
  type FragmentDefinitionNode,
  type OperationDefinitionNode,
} from 'graphql';
import { promisify } from 'util';
import { isImport, importToImportInfo } from '@teip/utils';

type DefinitionNode = FragmentDefinitionNode | OperationDefinitionNode;

const readFile = promisify(fs.readFile);

export type WaldImport = {
  filePath: string,
  name: string,
};

type WaldFile = {
  filePath: string,
  references: WaldImport[],
  definitions: DefinitionNode[],
};

type PathMap = Map<string, WaldFile | 'pending'>;

function readImports(filePath: string, content: string): [string, WaldImport[]] {
  const lines = content.split('\n');
  const lastImport = lines.findIndex(line => !isImport(line));

  const imports = lines.slice(0, lastImport);
  const strippedContent = lines.slice(lastImport).join('\n');

  const references = imports
    .map(importToImportInfo)
    .map(importInfo =>
      importInfo.names.map((name: string) => ({
        name,
        filePath: path.join(path.dirname(filePath), importInfo.path),
      })),
    )
    .reduce((p: Array<*>, n) => p.concat(n), []);

  return [strippedContent, references];
}

function resolveFile(filePath: string): Promise<WaldFile> {
  return readFile(filePath, 'utf-8').then(content => {
    const [strippedContent, references] = readImports(filePath, content);
    const { definitions } = parse(strippedContent);

    return { filePath, references, definitions };
  });
}

export function fillMap(filePath: string, pathMap?: PathMap = new Map()): Promise<PathMap> {
  if (!pathMap.has(filePath)) {
    pathMap.set(filePath, 'pending');
    return resolveFile(filePath).then(graphqlFile => {
      pathMap.set(filePath, graphqlFile);
      if (graphqlFile.references.length === 0) {
        return pathMap;
      }
      return Promise.all(
        graphqlFile.references.map(reference => fillMap(reference.filePath, pathMap)),
      ).then(() => pathMap);
    });
  }
  return Promise.resolve(pathMap);
}

export function resolveName(
  pathMap: PathMap,
  name: string,
  file: string,
): { definition: FragmentDefinitionNode, file: string } {
  const fileTree = pathMap.get(file);
  if (!fileTree) {
    throw new Error(`File "${file}" could not be found in the pathMap`);
  }
  if (fileTree === 'pending') {
    throw new Error('The path map is still being build asyncroniously');
  }

  const definition: ?DefinitionNode = fileTree.definitions.find(def => def.name.value === name);
  if (definition) {
    return { definition, file };
  }

  const graphqlImport = fileTree.references.find(imp => imp.name === name);
  if (graphqlImport) {
    return resolveName(pathMap, name, graphqlImport.filePath);
  }
  throw new Error(`Could not resolve name "${name}" in file "${file}"`);
}

export function resolveFragmentName(
  pathMap: PathMap,
  name: string,
  file: string,
): { definition: FragmentDefinitionNode, file: string } {
  const res = resolveName(pathMap, name, file);
  if (res.definition.kind !== 'FragmentDefinition') {
    throw new Error('Found name "${name}" in file but it was not a fragment definition');
  }
  return res;
}

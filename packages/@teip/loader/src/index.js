/* @flow */
import { parse } from 'graphql';
import { importRegex, transformImport, joinDocuments, findFragmentReferences } from './util';

export default function teipLoader(source: string) {
  const lines = source.split('\n');
  const lastImport = lines.findIndex(line => !line.match(importRegex));
  const imports = lines.slice(0, lastImport);
  const body = lines.slice(lastImport);
  const transformedImports = imports.map(transformImport);

  const { definitions } = parse(source);

  const transformedDefinition: string[] = definitions.map(definition => {
    let name = 'Unknown';
    const doc = {
      kind: 'Document',
      definitions: [definition],
    };
    const references = findFragmentReferences(doc).map(name => `${name}Fragment`);

    if (definition.kind === 'FragmentDefinition') {
      name = definition.name.value + 'Fragment';
    } else if (definition.kind === 'OperationDefinition') {
      if (!definition.name) {
        this.emitError(
          `One of your operations is missing a name. @teip/loader needs all operations to have names.`,
        );
        return '';
      }
      name =
        definition.name.value +
        definition.operation.charAt(0).toUpperCase() +
        definition.operation.slice(1);
    } else {
      this.emitError(
        `${
          this.resourcePath
        } contains definitions that are neither fragments nor operations. The @teip/loader can only handle fragments and operations!`,
      );
      return '';
    }

    if (references.length > 0) {
      return `var ${name} = joinDocuments(${references.join(', ')}, ${JSON.stringify(doc)});

export { ${name} };`;
    }
    return `var ${name} = ${JSON.stringify(doc)};

export { ${name} };`;
  });

  return `${transformedImports.join('\n')}

${joinDocuments.toString()}

${transformedDefinition.join('\n\n')}
`;
}

/* @flow */
import { parse } from 'graphql';
import * as loaderUtils from 'loader-utils';
import { importRegex, transformImport, joinDocuments, findFragmentReferences } from './util';

const defaultOptions = { esModules: true };

export default function teipLoader(source: string) {
  // Option parsing
  const options = Object.assign({}, defaultOptions, loaderUtils.getOptions(this));
  console.log(options);

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

    const stringifiedOperation = JSON.stringify(doc);
    let operation = stringifiedOperation;
    if (references.length > 0) {
      operation = `var ${name} = joinDocuments(${references.join(', ')}, ${stringifiedOperation});`;
    }
    if (options.esModules) {
      return `var ${name} = ${operation};

export { ${name} };`;
    }
    return `exports.${name} = ${operation}`;
  });

  return `${transformedImports.join('\n')}

${joinDocuments.toString()}

${transformedDefinition.join('\n\n')}
`;
}

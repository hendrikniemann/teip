# Teip utils

This is just a utility package that exports some useful functions that are relevant for a lot of packages.

```js
declare function definitionToVariableName(definition: DefinitionNode): string;

declare function definitionToTypeName(definition: DefinitionNode): string;

declare var importRegex: RegExp;

declare function isImport(str: string): boolean;

type ImportInfo = {
  path: string,
  names: string[],
};

declare function importToImportInfo(line: string): ImportInfo;
```

# Wald - A GraphQL dependency resolution engine

Wald enables you to import fragments from other graphql files into your qraphql files. Wald then parses the files and creates an alternative Wald file node similar to the `DocumentNode` from [graphql-js](https://github.com/graphql/graphql-js). It will then recursively resolve all files that are referenced and fill a map that maps the file path to the Wald file info object.

## API

### Type `WaldImport`

#### filePath: string

The path to the file that the import leads to.

#### name: string

The name or identifier that is imported from the filePath destination

### Type `WaldFile`

#### filePath: string

The path where the file can be found (this is identical to the key in the result map)

### references: WaldImport[]

Array of referenced fragments from other files

### definitions: DefinitionNode[]

Definitions available inside of this file

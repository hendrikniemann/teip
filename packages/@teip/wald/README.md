# Wald - A GraphQL dependency resolution engine

Wald enables a special import syntax for graphql files and offers a simple dependency resolving algorithm.

```graphql
#import { MyFragment } from './myFragment.graphql'

query HelloWorld {
  hello {
    ...MyFragment
  }
}
```

## Introduction

Wald enables you to import fragments from other graphql files into your qraphql file. Wald then parses the files and creates a Wald file tree structure similar to the `DocumentNode` from [graphql-js](https://github.com/graphql/graphql-js) but with support for imports. It will then recursively resolve all files that are referenced and fill a map that maps the file path to the Wald file info object. If you just want to use the capabilities that Wald provides, this is probably the wrong package for you. Instead you can use the existing solutions that depend on this package. For webpack use [@teip/loader](../loader). For creating flow types and everything else the Teip framework offers use [@teip/cli](../cli).

Wald also comes with some utility functions that help out with working on a PathMap. For more on that read the [usage section](#usage).

This package is used internally within the Teip framework. Let me know about your ideas especially if you are using it elsewhere.

## Usage

For this we will assume the following file structure:

```
src
 |- myFragment.graphql
 '- myQuery.graphql (import { MyFragment } from './myFragment.graphql')
```

Lets assume you are interested in a specific GraphQL definition file. You can use `resolveFile` to asynchronously resolve the content of a file and receive the `WaldFile` representation of the file. This representation contains the `definitions` just like you are used from `DocumentNode` from _graphql-js_. It also contains the file name and all the imports of the file.

```js
const file = await resolveFile('./myQuery.graphql');
/* {
     filePath: './myQuery.graphql',
     imports: [{ filePath: './myFragment.graphql', name: 'MyFragment' }],
     definitions: [{ kind: 'OperationDefinition', ... }],
   } */
```

When you are now working with the file, e.g. going through a selection, you come across fragment references. Since Wald enables importing fragment definitions the definition can either be found in the file itself (`definitions`) or in the imports. If the definition is in the imports the imported file has to be resolved as well and the definition might then be found in the imported file. This definition again can have references to other files and they will all have to be recursively resolved. To make this a bit easier and more efficient Wald comes with the idea of a `PathMap`. A path map contains all the `WaldFile` results for all the files that are required.

```js
const pathMap = await fillMap('./myQuery.graphql');
/* Map {
     './myQuery.graphql' => { ... },
     './myFragment.graphql' => { ... },
   } */

// Can be resolved within the query file since it is imported here
const fragment = resolveFragmentName(pathMap, 'MyFragment', './myQuery.graphql');

// Or directly in the file where it is defined
fragment === resolveFragmentName(pathMap, 'MyFragment', './myFragment.graphql');
```

This way the dependencies can all be resolved at once and afterwards quick synchronous lookups are possible.

It is also possible to resolve any kind of definition using the more general `resolveName`. Both functions will throw if the name cannot be resolved but `resolveFragmentName` will also throw when the name can be resolved but the found definition is not a fragment definition.

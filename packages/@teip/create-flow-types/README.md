# Generate Flow Types

Generate flow types using a schema and a query.

## Design

The generator exports a function that turns a GraphQLSchema and a parsed GraphQL AST into a Babel AST that represents the type structure.

```js
function documentToModule(parent: GraphQLSchema, node: DocumentNode): BabelAST
```

To achieve this the program is composed recursively into functions that solve a subtask of the overall task. This works because the Flow type system and the GraphQL type system are similar enough that sub-solutions can form the overall solution.

## How does this compare to _Apollo Codegen_

[Apollo Codegen](https://github.com/apollographql/apollo-codegen) targets multiple platforms such as Typescript, Scala and Swift. By focusing on flow types this project tries to iterate faster and make customisation in different dimensions easier.

Also teip requires your GraphQL documents to be written inside of pure `.graphql` files. This allows teip to create `.graphql.flow` files next to these files that contain the definitions for the queries inside.

/* @flow */
import * as G from 'graphql';

/**
 * Returns the type of a fragment from the fragment type definition:
 * See: http://facebook.github.io/graphql/October2016/#sec-Type-Conditions
 */
export function getFragmentDefinitionNodeType(
  parent: G.GraphQLSchema,
  node: G.FragmentDefinitionNode,
): G.GraphQLObjectType | G.GraphQLUnionType | G.GraphQLInterfaceType {
  const typeName: string = node.typeCondition.name.value;
  const type = parent.getType(typeName);
  if (!type) {
    throw new Error(`Type ${typeName} of fragment ${node.name.value} not found in Schema!`);
  }
  if (
    type instanceof G.GraphQLUnionType ||
    type instanceof G.GraphQLInterfaceType ||
    type instanceof G.GraphQLObjectType
  ) {
    return type;
  }
  throw new Error(`${typeName} is not fragmentable!`);
}

export function getOperationDefinitionNodeType(
  parent: G.GraphQLSchema,
  node: G.OperationDefinitionNode,
): G.GraphQLObjectType {
  switch (node.operation) {
    case 'query':
      const Query = parent.getQueryType();
      if (!Query) {
        throw new Error('Query operation detected but schema has no query type!');
      }
      return Query;
    default:
      throw new Error(`Operation type ${node.operation} is not supported!`);
  }
}

export function getFieldNodeType(
  parent: G.GraphQLObjectType | G.GraphQLInterfaceType,
  node: G.FieldNode,
): G.GraphQLType {
  const field: ?G.GraphQLField<*, *> = parent.getFields()[node.name.value];
  if (!field) {
    throw new Error(`Could not access field ${node.name.value} on GraphQL type ${parent.name}`);
  }
  return field.type;
}

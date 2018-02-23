/* @flow */
import * as G from 'graphql';
import * as T from '@babel/types';
import {
  getOperationDefinitionNodeType,
  getFieldNodeType,
  getFragmentDefinitionNodeType,
} from './type';
import flatten from 'lodash.flatten';

type BabelAST = Object;

const typeMap = {
  [G.GraphQLID.name]: () => T.stringTypeAnnotation(),
  [G.GraphQLString.name]: () => T.stringTypeAnnotation(),
  [G.GraphQLInt.name]: () => T.numberTypeAnnotation(),
  [G.GraphQLFloat.name]: () => T.numberTypeAnnotation(),
  [G.GraphQLBoolean.name]: () => T.booleanTypeAnnotation(),
};

/**
 * Converts a GraphQL scalar type into the AST of the corresponding Flow type annotation.
 * User defined scalars are (for now) annotated with any.
 */
export function scalarToTypeAnnotation(type: G.GraphQLScalarType): BabelAST {
  if (typeof typeMap[type.name] !== 'undefined') {
    return typeMap[type.name]();
  }
  return T.anyTypeAnnotation();
}

/**
 * Converts a GraphQL enum type into the AST of a Flow string literal union type.
 */
export function enumToTypeAnnotation(type: G.GraphQLEnumType): BabelAST {
  const values: string[] = type
    .getValues()
    .map(value => T.stringLiteral(/*TypeAnnotation*/ value.name));
  return T.unionTypeAnnotation(values);
}

export function unionSelectionSetToTypeDefinition(
  type: G.GraphQLUnionType,
  node: G.SelectionSetNode,
): BabelAST {
  const union = type.getTypes();
  const selections: Array<BabelAST[] | BabelAST> = node.selections.map(selection => {
    // __typename is the only direct field selection allowed on unions and included by default
    if (selection.kind === G.Kind.FIELD || selection === '__typename') {
      return [];
    }
    if (selection.kind !== G.Kind.INLINE_FRAGMENT || !selection.typeCondition) {
      throw new Error(`Union type selections must be inline fragment with type condition!`);
    }

    const conditionTypeName: string = selection.typeCondition.name.value;
    const conditionType: ?G.GraphQLObjectType = union.find(type => type.name === conditionTypeName);

    if (!conditionType) {
      throw new Error(`Type ${conditionTypeName} not found in union type ${parent.name}`);
    }

    return objectSelectionSetToTypeDefinition(conditionType, selection.selectionSet);
  });

  return T.unionTypeAnnotation(flatten(selections));
}

export function objectSelectionSetToTypeDefinition(
  type: G.GraphQLObjectType,
  node: G.SelectionSetNode,
): BabelAST {
  const selections: Array<*> = node.selections.map(selection => {
    if (selection.kind === G.Kind.FIELD) {
      return fieldToTypeAnnotation(type, selection);
    } else if (selection.kind === G.Kind.FRAGMENT_SPREAD) {
      return fragmentSpreadToTypeAnnotation(type, selection);
    } else if (selection.kind === G.Kind.INLINE_FRAGMENT) {
      return objectSelectionSetToTypeDefinition(type, selection.selectionSet);
    }
    throw new Error(`Unknown selection of kind ${selection.kind}`);
  });
  return T.objectTypeAnnotation(flatten(selections));
}

/**
 * Converts a GraphQL list type into the AST of a Flow array type annotation.
 */
export function listToTypeAnnotation(type: G.GraphQLList<*>, node: G.FieldNode): BabelAST {
  return T.arrayTypeAnnotation(wrapNullableAnnotation(type.ofType, node));
}

/**
 * Converts a nullable type into the AST of a nullable flow type annotation.
 */
export function wrapNullableAnnotation(type: G.GraphQLOutputType, node: G.FieldNode): BabelAST {
  if (type instanceof G.GraphQLNonNull) {
    return typeToTypeAnnotation(type.ofType, node);
  }
  return T.nullableTypeAnnotation(typeToTypeAnnotation(type, node));
}

/**
 * Converts a GraphQL object type into the AST of a Flow object type annotation.
 */
export function objectToTypeAnnotation(type: G.GraphQLObjectType, node: G.FieldNode): BabelAST {
  if (!node.selectionSet) {
    throw new Error(`Object types need subselections!`);
  }
  return objectSelectionSetToTypeDefinition(type, node.selectionSet);
}

/**
 * Union sets only allow inline fragment selections. We can simply create a union type of all
 * subselectoins for a union types subselection
 */
export function unionToTypeAnnotation(type: G.GraphQLUnionType, node: G.FieldNode): BabelAST {
  if (!node.selectionSet) {
    throw new Error('Union types need subselections!');
  }
  return unionSelectionSetToTypeDefinition(type, node.selectionSet);
}

/**
 * Converts any GraphQL type into the AST of a Flow type annotation.
 */
export function typeToTypeAnnotation(type: G.GraphQLOutputType, node: G.FieldNode): BabelAST {
  if (type instanceof G.GraphQLObjectType) {
    return objectToTypeAnnotation(type, node);
  } else if (type instanceof G.GraphQLScalarType) {
    return scalarToTypeAnnotation(type);
  } else if (type instanceof G.GraphQLEnumType) {
    return enumToTypeAnnotation(type);
  } else if (type instanceof G.GraphQLList) {
    return listToTypeAnnotation(type, node);
  } else if (type instanceof G.GraphQLUnionType) {
    return unionToTypeAnnotation(type, node);
  } else if (type instanceof G.GraphQLNonNull) {
    throw new Error('`typeToTypeAnnotation` should not be called with GraphQLNonNull!');
  }
  throw new Error(
    `typeToTypeAnnotation was called with type ${type.name} but was unable handle this type.`,
  );
}

/**
 * Converts a GraphQL field selection into the AST of a Flow object property type definition.
 */
export function fieldToTypeAnnotation(
  parent: G.GraphQLObjectType | G.GraphQLInterfaceType,
  node: G.FieldNode,
): BabelAST {
  const gqlType: G.GraphQLType = getFieldNodeType(parent, node);
  debugger;
  if (gqlType instanceof G.GraphQLInputObjectType || gqlType instanceof G.GraphQLInterfaceType) {
    throw new Error('Interfaces and inputs not supported!');
  }
  const name = node.alias || node.name;
  return T.objectTypeProperty(T.identifier(name.value), wrapNullableAnnotation(gqlType, node));
}

/**
 * Creates a flow type annotation for a fragment spread operation.
 */
export function fragmentSpreadToTypeAnnotation(
  parent: G.GraphQLObjectType,
  node: G.FragmentSpreadNode,
): BabelAST {
  return T.objectTypeSpreadProperty(T.identifier(`${node.name.value}FragmentType`));
}

export function fragmentDefinitionToTypeDefinition(
  parent: G.GraphQLSchema,
  node: G.FragmentDefinitionNode,
): BabelAST {
  const type = getFragmentDefinitionNodeType(parent, node);
  let selectionAnnotation: Object;
  if (type instanceof G.GraphQLUnionType) {
    selectionAnnotation = unionSelectionSetToTypeDefinition(type, node.selectionSet);
  } else if (type instanceof G.GraphQLObjectType) {
    selectionAnnotation = objectSelectionSetToTypeDefinition(type, node.selectionSet);
  }
  return T.typeAlias(T.identifier(`${node.name.value}FragmentType`), null, selectionAnnotation);
}

export function operationDefinitionToTypeDefinition(
  parent: G.GraphQLSchema,
  node: G.OperationDefinitionNode,
): BabelAST {
  const type = getOperationDefinitionNodeType(parent, node);
  if (node.operation === 'query') {
    const id = node.name ? `${node.name.value}QueryType` : 'QueryType';
    return T.typeAlias(
      T.identifier(id),
      null,
      objectSelectionSetToTypeDefinition(type, node.selectionSet),
    );
  }
  throw new Error(`Operation ${node.operation} not supported`);
}

export function definitionToTypeDefinition(
  type: G.GraphQLSchema,
  node: G.DefinitionNode,
): BabelAST {
  let definition: BabelAST;
  if (node.kind === G.Kind.OPERATION_DEFINITION) {
    definition = operationDefinitionToTypeDefinition(type, node);
  } else if (node.kind === G.Kind.FRAGMENT_DEFINITION) {
    definition = fragmentDefinitionToTypeDefinition(type, node);
  } else {
    throw new Error(`Operation ${node.kind} not supported`);
  }

  return T.exportNamedDeclaration(definition, []);
}

/**
 * Converts a document to a list of statement definitions.
 * Use this when you want to embed the document's type definitions deeper into a program.
 */
export function documentToStatements(node: G.DocumentNode, parent: G.GraphQLSchema): BabelAST[] {
  return node.definitions.map(definition => definitionToTypeDefinition(parent, definition));
}

/**
 * Converts a GraphQL document into the AST of a JavaScript module.
 * Use this function to convert a whole GraphQL file into a Javascript type definition file.
 */
export function documentToModule(node: G.DocumentNode, parent: G.GraphQLSchema): BabelAST {
  return T.file(T.program(documentToStatements(node, parent)));
}

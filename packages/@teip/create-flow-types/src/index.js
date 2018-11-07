/* @flow */
import * as G from 'graphql';
import * as T from '@babel/types';
import flatten from 'lodash.flatten';
import { resolveFragmentName } from '@teip/wald';
import { definitionToVariableName, definitionToTypeName } from '@teip/utils';
import {
  getOperationDefinitionNodeType,
  getFieldNodeType,
  getFragmentDefinitionNodeType,
} from './type';
import { mergeObjectTypes } from './util';

type BabelAST = Object;
type PathMap = Map<any, any>;

const typeMap = {
  [G.GraphQLID.name]: () => T.stringTypeAnnotation(),
  [G.GraphQLString.name]: () => T.stringTypeAnnotation(),
  [G.GraphQLInt.name]: () => T.numberTypeAnnotation(),
  [G.GraphQLFloat.name]: () => T.numberTypeAnnotation(),
  [G.GraphQLBoolean.name]: () => T.booleanTypeAnnotation(),
};

export function createTypes(entryFile: string, schema: G.GraphQLSchema, pathMap: PathMap) {
  /**
   * Converts a GraphQL scalar type into the AST of the corresponding Flow type annotation.
   * User defined scalars are (for now) annotated with any.
   */
  function scalarToTypeAnnotation(type: G.GraphQLScalarType) {
    if (typeof typeMap[type.name] !== 'undefined') {
      return typeMap[type.name]();
    }
    return T.anyTypeAnnotation();
  }

  /**
   * Converts a GraphQL enum type into the AST of a Flow string literal union type.
   */
  function enumToTypeAnnotation(type: G.GraphQLEnumType) {
    const values = type.getValues().map(value => T.stringLiteralTypeAnnotation(value.name));
    return T.unionTypeAnnotation(values);
  }

  /**
   * Creates a Flow type definitions for a union's subselection.
   */
  function unionSelectionSetToTypeDefinition(
    type: G.GraphQLUnionType,
    node: G.SelectionSetNode,
    file: string,
  ) {
    const union = type.getTypes();
    const selections: Array<BabelAST[] | BabelAST> = node.selections.map(selection => {
      // __typename is the only direct field selection allowed on unions and included by default
      if (selection.kind === G.Kind.FIELD && selection === '__typename') {
        return [];
      }
      if (selection.kind !== G.Kind.INLINE_FRAGMENT || !selection.typeCondition) {
        throw new Error(`Union type selections must be inline fragment with type condition!`);
      }

      const conditionTypeName: string = selection.typeCondition.name.value;
      const conditionType: ?G.GraphQLObjectType = union.find(
        type => type.name === conditionTypeName,
      );

      if (!conditionType) {
        throw new Error(`Type ${conditionTypeName} not found in union type ${parent.name}`);
      }

      return objectSelectionSetToTypeDefinition(conditionType, selection.selectionSet, file);
    });

    return T.unionTypeAnnotation(flatten(selections));
  }

  /**
   * Creates a Flow type annotation for an interface's subselection.
   */
  function interfaceSelectionSetToTypeDefinition(
    type: G.GraphQLInterfaceType,
    node: G.SelectionSetNode,
    file: string,
  ) {
    const inlineFragments = node.selections
      .filter(selection => selection.kind === G.Kind.INLINE_FRAGMENT)
      .map((selection: G.InlineFragmentNode) => {
        const conditionTypeName: string = selection.typeCondition.name.value;
        const conditionType: ?G.GraphQLObjectType = schema.getType(conditionTypeName);
        if (!conditionType) {
          throw new Error(`Type ${conditionTypeName} does not exist in schema.`);
        }
        if (!conditionType.getInterfaces().includes(type)) {
          throw new Error(`Type ${conditionTypeName} does not implement interface ${parent.name}.`);
        }

        return objectSelectionSetToTypeDefinition(conditionType, selection.selectionSet, file);
      });

    const x = objectSelectionSetToTypeDefinition(
      type,
      {
        selections: node.selections.filter(selection => selection.kind !== G.Kind.INLINE_FRAGMENT),
      },
      file,
    );

    if (inlineFragments.length === 0) {
      return x;
    }

    return T.unionTypeAnnotation(inlineFragments.map(fragment => mergeObjectTypes(fragment, x)));
  }

  function objectSelectionSetToTypeDefinition(
    type: G.GraphQLObjectType,
    node: G.SelectionSetNode,
    file: string,
  ) {
    const fragments = [];
    const selections: Array<*> = node.selections.map(selection => {
      if (selection.kind === G.Kind.FIELD) {
        // we will add typename later in this function and should therefore not include it here
        if (selection.name.value === '__typename') {
          return [];
        }
        return fieldToTypeAnnotation(type, selection, file);
      } else if (selection.kind === G.Kind.FRAGMENT_SPREAD) {
        fragments.push(selection.name.value);
        return [];
      } else if (selection.kind === G.Kind.INLINE_FRAGMENT) {
        return objectSelectionSetToTypeDefinition(type, selection.selectionSet, file);
      }
      throw new Error(`Unknown selection of kind ${selection.kind}`);
    });

    // Always add __typename as the first property
    selections.unshift([
      T.objectTypeProperty(
        T.identifier('__typename'),
        T.stringLiteralTypeAnnotation(type.name),
        T.variance('plus'),
      ),
    ]);

    return mergeObjectTypes(
      T.objectTypeAnnotation(flatten(selections)),
      ...fragments
        .map(name => resolveFragmentName(pathMap, name, file))
        .map(
          ({ definition, file: resolvedFile }) =>
            fragmentDefinitionToTypeDefinition(definition, resolvedFile).right,
        ),
    );
  }

  /**
   * Converts a GraphQL list type into the AST of a Flow array type annotation.
   */
  function listToTypeAnnotation(type: G.GraphQLList<*>, node: G.FieldNode, file: string) {
    return T.genericTypeAnnotation(
      T.identifier('$ReadOnlyArray'),
      T.typeParameterInstantiation([wrapNullableAnnotation(type.ofType, node, file)]),
    );
  }

  /**
   * Converts a nullable type into the AST of a nullable flow type annotation.
   */
  function wrapNullableAnnotation(type: G.GraphQLOutputType, node: G.FieldNode, file: string) {
    if (type instanceof G.GraphQLNonNull) {
      return typeToTypeAnnotation(type.ofType, node, file);
    }
    return T.nullableTypeAnnotation(typeToTypeAnnotation(type, node, file));
  }

  /**
   * Converts a GraphQL object type into the AST of a Flow object type annotation.
   */
  function objectToTypeAnnotation(type: G.GraphQLObjectType, node: G.FieldNode, file: string) {
    if (!node.selectionSet) {
      throw new Error(`Object types need subselections!`);
    }
    return objectSelectionSetToTypeDefinition(type, node.selectionSet, file);
  }

  /**
   * Union sets only allow inline fragment selections. We can simply create a union type of all
   * subselectoins for a union types subselection
   */
  function unionToTypeAnnotation(type: G.GraphQLUnionType, node: G.FieldNode, file: string) {
    if (!node.selectionSet) {
      throw new Error('Union types need subselections!');
    }
    return unionSelectionSetToTypeDefinition(type, node.selectionSet, file);
  }

  /**
   * Interfaces are probably the most tricky types with subselections. Also here we delegate to the
   * function that does the subselection for us.
   */
  function interfaceToTypeAnnotation(
    type: G.GraphQLInterfaceType,
    node: G.FieldNode,
    file: string,
  ) {
    if (!node.selectionSet) {
      throw new Error('Interface types need subselections!');
    }
    return interfaceSelectionSetToTypeDefinition(type, node.selectionSet, file);
  }

  /**
   * Converts any GraphQL type into the AST of a Flow type annotation.
   */
  function typeToTypeAnnotation(type: G.GraphQLOutputType, node: G.FieldNode, file: string) {
    if (type instanceof G.GraphQLObjectType) {
      return objectToTypeAnnotation(type, node, file);
    } else if (type instanceof G.GraphQLScalarType) {
      return scalarToTypeAnnotation(type);
    } else if (type instanceof G.GraphQLEnumType) {
      return enumToTypeAnnotation(type);
    } else if (type instanceof G.GraphQLList) {
      return listToTypeAnnotation(type, node, file);
    } else if (type instanceof G.GraphQLUnionType) {
      return unionToTypeAnnotation(type, node, file);
    } else if (type instanceof G.GraphQLInterfaceType) {
      return interfaceToTypeAnnotation(type, node, file);
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
  function fieldToTypeAnnotation(
    parent: G.GraphQLObjectType | G.GraphQLInterfaceType,
    node: G.FieldNode,
    file: string,
  ) {
    if (node.name.value === '__typename') {
      throw new Error('`fieldToTypeAnnotation` cannot be called with "__typename".');
    }
    const gqlType: G.GraphQLType = getFieldNodeType(parent, node);
    if (gqlType instanceof G.GraphQLInputObjectType || gqlType instanceof G.GraphQLInterfaceType) {
      throw new Error('Interfaces and inputs not supported!');
    }
    const name = node.alias || node.name;
    return T.objectTypeProperty(
      T.identifier(name.value),
      wrapNullableAnnotation(gqlType, node, file),
      T.variance('plus'),
    );
  }

  function fragmentDefinitionToTypeDefinition(node: G.FragmentDefinitionNode, file: string) {
    const type = getFragmentDefinitionNodeType(schema, node);
    let selectionAnnotation;
    if (type instanceof G.GraphQLUnionType) {
      selectionAnnotation = unionSelectionSetToTypeDefinition(type, node.selectionSet, file);
    } else if (type instanceof G.GraphQLObjectType) {
      selectionAnnotation = objectSelectionSetToTypeDefinition(type, node.selectionSet, file);
    } else if (type instanceof G.GraphQLInterfaceType) {
      selectionAnnotation = interfaceSelectionSetToTypeDefinition(type, node.selectionSet, file);
    } else {
      throw new TypeError(`Fragment ${type.name} was defined on type that cannot be fragmented!`);
    }
    return T.typeAlias(
      T.identifier(`${node.name.value}FragmentType`),
      undefined,
      selectionAnnotation,
    );
  }

  function operationDefinitionToTypeDefinition(node: G.OperationDefinitionNode) {
    const type = getOperationDefinitionNodeType(schema, node);
    const id = definitionToTypeName(node);
    return T.typeAlias(
      T.identifier(id),
      undefined,
      objectSelectionSetToTypeDefinition(type, node.selectionSet, entryFile),
    );
  }

  function definitionToTypeDefinition(node: G.DefinitionNode, file: string) {
    let definition;
    if (node.kind === G.Kind.OPERATION_DEFINITION) {
      definition = operationDefinitionToTypeDefinition(node);
    } else if (node.kind === G.Kind.FRAGMENT_DEFINITION) {
      definition = fragmentDefinitionToTypeDefinition(node, file);
    } else {
      throw new Error(`Operation ${node.kind} not supported`);
    }

    return T.exportNamedDeclaration(definition, []);
  }

  const fileTree = pathMap.get(entryFile);
  if (!fileTree) {
    throw new Error('File not found');
  }

  const typeExportStatements = fileTree.definitions.map(definition =>
    definitionToTypeDefinition(definition, entryFile),
  );

  const exportStatments = fileTree.definitions.map((definition: G.DefinitionNode) => {
    const name = definitionToVariableName(definition);

    const id = T.identifier(name);
    Object.assign(id, {
      typeAnnotation: T.typeAnnotation(T.genericTypeAnnotation(T.identifier('DefinitionNode'))),
    });
    return T.declareExportDeclaration(T.declareVariable(id));
  });

  return T.file(T.program(typeExportStatements.concat(exportStatments)));
}

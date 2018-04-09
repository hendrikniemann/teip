/* @flow */
import * as T from '@babel/types';
import flatten from 'lodash.flatten';

// Hack to extract the Babel internal types
const tOTP = T.objectTypeProperty(T.identifier('str'), T.nullLiteralTypeAnnotation());
const tOTA = T.objectTypeAnnotation([tOTP]);
type BabelNodeObjectTypeProperty = typeof tOTP;
type BabelNodeObjectTypeAnnotation = typeof tOTA;

/**
 * This function merges two object types and makes the following assertions doing so in the context
 * of GraphQL type generation:
 * 1. Variance is always "plus"
 * 2. No indexers, call properties etc.
 *
 * Throws an error if there is a type conflict.
 * Recursively merges properties with the same name if they are both of object type annotation
 */
export function mergeObjectTypes(
  ...types: BabelNodeObjectTypeAnnotation[]
): BabelNodeObjectTypeAnnotation {
  const properties: BabelNodeObjectTypeProperty[] = flatten(types.map(type => type.properties));
  const propertyMap: Map<string, BabelNodeObjectTypeProperty> = new Map();
  properties.forEach(property => {
    // If the property already exists we need to merge here
    const existing = propertyMap.get(property.key.name);
    if (existing) {
      if (existing.value.type !== property.value.type) {
        throw new Error(
          `Error merging properties "${property.key.name}" and "${existing.key.name}"!`,
        );
      }
      if (T.isObjectTypeAnnotation(existing.value) && T.isObjectTypeAnnotation(property.value)) {
        // $FlowFixMe % checks not really working yet...
        const newValue = mergeObjectTypes(existing.value, property.value);
        propertyMap.set(
          property.key.name,
          T.objectTypeProperty(T.clone(existing.key), newValue, T.variance('plus')),
        );
      }
      // Nothing else to do here since the type is correct already
    } else {
      propertyMap.set(property.key.name, property);
    }
  });
  return T.objectTypeAnnotation([...propertyMap.values()]);
}

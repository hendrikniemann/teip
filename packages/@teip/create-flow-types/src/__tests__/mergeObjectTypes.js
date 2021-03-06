/* @flow */
import { parse } from 'babylon';
import * as T from '@babel/types';
import { mergeObjectTypes } from '../util';

/*::
// Unfortunately Babel does not export the types yet...
const someObjectType = T.objectTypeAnnotation([]);
type BabelNodeObjectTypeAnnotation = typeof someObjectType;
*/

function parseApplied(exp: string): BabelNodeObjectTypeAnnotation {
  return parse(exp, { plugins: ['flow'] }).program.body[0].right;
}

function expectProperty(prop, propName, typeName) {
  expect(prop).toHaveProperty('value.type', typeName);
  expect(prop).toHaveProperty('key.name', propName);
}

describe('mergeObjectTypes', () => {
  it('should merge simple object types', () => {
    const typeA = parseApplied('type TypeA = { a: string }');
    const typeB = parseApplied('type TypeB = { b: number }');
    const result = mergeObjectTypes(typeA, typeB);

    expect(result.properties.length).toBe(2);
    expectProperty(result.properties[0], 'a', 'StringTypeAnnotation');
    expectProperty(result.properties[1], 'b', 'NumberTypeAnnotation');
  });

  it('should not dublicate properties if the occurr in both types', () => {
    const typeA = parseApplied('type TypeA = { a: string }');
    const typeB = parseApplied('type TypeB = { a: string }');
    const result = mergeObjectTypes(typeA, typeB);

    expect(result.properties.length).toBe(1);
    expectProperty(result.properties[0], 'a', 'StringTypeAnnotation');
  });

  it('should merge bigger objects', () => {
    const typeA = parseApplied('type TypeA = { a: string, b: boolean }');
    const typeB = parseApplied(`
      type TypeB = {
        c: number,
        d: void,
        e: { x: number },
      }
    `);
    const result = mergeObjectTypes(typeA, typeB);

    expect(result.properties.length).toBe(5);
    expectProperty(result.properties[0], 'a', 'StringTypeAnnotation');
    expectProperty(result.properties[1], 'b', 'BooleanTypeAnnotation');
    expectProperty(result.properties[2], 'c', 'NumberTypeAnnotation');
    expectProperty(result.properties[3], 'd', 'VoidTypeAnnotation');
    expectProperty(result.properties[4], 'e', 'ObjectTypeAnnotation');
  });

  it('should merge properties recursively if conflicting properties are both object types', () => {
    const typeA = parseApplied('type TypeA = { a: { a: string } }');
    const typeB = parseApplied('type TypeB = { a: { b: number } }');
    const result = mergeObjectTypes(typeA, typeB);

    expect(result.properties.length).toBe(1);
    expectProperty(result.properties[0], 'a', 'ObjectTypeAnnotation');
    const child = result.properties[0].value;
    expect(child.properties.length).toBe(2);
    expectProperty(child.properties[0], 'a', 'StringTypeAnnotation');
    expectProperty(child.properties[1], 'b', 'NumberTypeAnnotation');
  });

  it('should throw on type conflicts', () => {
    const typeA = parseApplied('type TypeA = { a: string }');
    const typeB = parseApplied('type TypeB = { a: number }');
    expect(() => {
      mergeObjectTypes(typeA, typeB);
    }).toThrowError();
  });

  it('should merge empty objects', () => {
    const typeA = parseApplied('type TypeA = { a: string }');
    const typeB = parseApplied('type TypeB = {}');
    const result = mergeObjectTypes(typeA, typeB);

    expect(result.properties.length).toBe(1);
    expectProperty(result.properties[0], 'a', 'StringTypeAnnotation');
  });

  it('should merge subproperties if both are arrays of objects', () => {
    const typeA = parseApplied('type TypeA = { a: { a: string }[] }');
    const typeB = parseApplied('type TypeB = { a: { b: number }[] }');
    const result = mergeObjectTypes(typeA, typeB);

    expect(result.properties.length).toBe(1);
    expectProperty(result.properties[0], 'a', 'ArrayTypeAnnotation');
    const child = result.properties[0].value.elementType;
    expect(child.properties.length).toBe(2);
    expectProperty(child.properties[0], 'a', 'StringTypeAnnotation');
    expectProperty(child.properties[1], 'b', 'NumberTypeAnnotation');
  });

  it('should merge subproperties if both are read only arrays of objects', () => {
    const typeA = parseApplied('type TypeA = { a: $ReadOnlyArray<{ a: string }> }');
    const typeB = parseApplied('type TypeB = { a: $ReadOnlyArray<{ b: number }> }');
    const result = mergeObjectTypes(typeA, typeB);

    expect(result.properties.length).toBe(1);
    expectProperty(result.properties[0], 'a', 'GenericTypeAnnotation');

    const { typeParameters } = result.properties[0].value;
    expect(typeParameters.type).toBe('TypeParameterInstantiation');
    expect(typeParameters.params.length).toBe(1);

    const child = typeParameters.params[0];
    expect(child.properties.length).toBe(2);
    expectProperty(child.properties[0], 'a', 'StringTypeAnnotation');
    expectProperty(child.properties[1], 'b', 'NumberTypeAnnotation');
  });
});

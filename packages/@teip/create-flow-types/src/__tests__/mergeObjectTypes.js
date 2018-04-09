/* @flow */
import { parse } from 'babylon';
import * as T from '@babel/types';
import { mergeObjectTypes } from '../util';

const parseApplied = (exp: string) => parse(exp, { plugins: ['flow'] });

function expectProperty(prop, propName, typeName) {
  expect(prop).toHaveProperty('value.type', typeName);
  expect(prop).toHaveProperty('key.name', propName);
}

describe('mergeObjectTypes', () => {
  it('should merge simple object types', () => {
    const typeA = parseApplied('type TypeA = { a: string }').program.body[0].right;
    const typeB = parseApplied('type TypeB = { b: number }').program.body[0].right;
    const result = mergeObjectTypes(typeA, typeB);

    expect(result.properties.length).toBe(2);
    expectProperty(result.properties[0], 'a', 'StringTypeAnnotation');
    expectProperty(result.properties[1], 'b', 'NumberTypeAnnotation');
  });

  it('should not dublicate properties if the occurr in both types', () => {
    const typeA = parseApplied('type TypeA = { a: string }').program.body[0].right;
    const typeB = parseApplied('type TypeB = { a: string }').program.body[0].right;
    const result = mergeObjectTypes(typeA, typeB);

    expect(result.properties.length).toBe(1);
    expectProperty(result.properties[0], 'a', 'StringTypeAnnotation');
  });

  it('should merge bigger objects', () => {
    const typeA = parseApplied('type TypeA = { a: string, b: boolean }').program.body[0].right;
    const typeB = parseApplied(`
      type TypeB = {
        c: number,
        d: void,
        e: { x: number },
      }
    `).program.body[0].right;
    const result = mergeObjectTypes(typeA, typeB);

    expect(result.properties.length).toBe(5);
    expectProperty(result.properties[0], 'a', 'StringTypeAnnotation');
    expectProperty(result.properties[1], 'b', 'BooleanTypeAnnotation');
    expectProperty(result.properties[2], 'c', 'NumberTypeAnnotation');
    expectProperty(result.properties[3], 'd', 'VoidTypeAnnotation');
    expectProperty(result.properties[4], 'e', 'ObjectTypeAnnotation');
  });

  it('should merge properties recursively if conflicting properties are both object types', () => {
    const typeA = parseApplied('type TypeA = { a: { a: string } }').program.body[0].right;
    const typeB = parseApplied('type TypeB = { a: { b: number } }').program.body[0].right;
    const result = mergeObjectTypes(typeA, typeB);

    expect(result.properties.length).toBe(1);
    expectProperty(result.properties[0], 'a', 'ObjectTypeAnnotation');
    const child = result.properties[0].value;
    expect(child.properties.length).toBe(2);
    expectProperty(child.properties[0], 'a', 'StringTypeAnnotation');
    expectProperty(child.properties[1], 'b', 'NumberTypeAnnotation');
  });

  it('should throw on type conflicts', () => {
    const typeA = parseApplied('type TypeA = { a: string }').program.body[0].right;
    const typeB = parseApplied('type TypeB = { a: number }').program.body[0].right;
    expect(() => {
      mergeObjectTypes(typeA, typeB);
    }).toThrowError();
  });

  it('should merge empty objects', () => {
    const typeA = parseApplied('type TypeA = { a: string }').program.body[0].right;
    const typeB = parseApplied('type TypeB = {}').program.body[0].right;
    const result = mergeObjectTypes(typeA, typeB);

    expect(result.properties.length).toBe(1);
    expectProperty(result.properties[0], 'a', 'StringTypeAnnotation');
  });
});

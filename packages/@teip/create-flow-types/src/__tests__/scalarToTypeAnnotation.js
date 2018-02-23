/* @flow */
import {
  GraphQLString,
  GraphQLID,
  GraphQLInt,
  GraphQLFloat,
  GraphQLScalarType,
  GraphQLBoolean,
} from 'graphql';
import { scalarToTypeAnnotation } from '../';
import * as T from '@babel/types';

const GraphQLCustom = new GraphQLScalarType({
  name: 'Custom',
  description: 'A simple custom scalar',
  serialize(val) {
    return JSON.stringify(val);
  },
});

describe('scalarToTypeAnnotation', () => {
  test('String', () => {
    expect(scalarToTypeAnnotation(GraphQLString)).toEqual(T.stringTypeAnnotation());
  });

  test('Int', () => {
    expect(scalarToTypeAnnotation(GraphQLInt)).toEqual(T.numberTypeAnnotation());
  });

  test('Float', () => {
    expect(scalarToTypeAnnotation(GraphQLFloat)).toEqual(T.numberTypeAnnotation());
  });

  test('ID', () => {
    expect(scalarToTypeAnnotation(GraphQLID)).toEqual(T.stringTypeAnnotation());
  });

  test('Boolean', () => {
    expect(scalarToTypeAnnotation(GraphQLBoolean)).toEqual(T.booleanTypeAnnotation());
  });

  test('Custom', () => {
    expect(scalarToTypeAnnotation(GraphQLCustom)).toEqual(T.anyTypeAnnotation());
  });
});

/* @flow */
import { GraphQLEnumType } from 'graphql';
import * as T from '@babel/types';
import { enumToTypeAnnotation } from '../';

const SingleValue = new GraphQLEnumType({
  name: 'SingleValue',
  values: {
    FIRST_VALUE: {
      description: 'First value of this enum',
    },
  },
});

const MultipleValues = new GraphQLEnumType({
  name: 'MultipleValues',
  values: {
    FIRST_VALUE: {
      description: 'First value of this enum',
    },
    SECOND_VALUE: {
      description: 'Second value of this enum',
    },
    THIRD_VALUE: {
      description: 'Third value of this enum',
    },
  },
});

describe('enumToTypeAnnotation', () => {
  test('Single value', () => {
    expect(enumToTypeAnnotation(SingleValue)).toEqual(
      T.unionTypeAnnotation([T.stringLiteral('FIRST_VALUE')]),
    );
  });

  test('Multiple Values', () => {
    expect(enumToTypeAnnotation(MultipleValues)).toEqual(
      T.unionTypeAnnotation([
        T.stringLiteral('FIRST_VALUE'),
        T.stringLiteral('SECOND_VALUE'),
        T.stringLiteral('THIRD_VALUE'),
      ]),
    );
  });
});

/* @flow */
import { transformToRequire } from '../util';

declare var describe: Function;
declare var it: Function;
declare var expect: Function;

describe('transformToRequire', () => {
  it('should convert imports with one imported identifier', () => {
    expect(transformToRequire("# import { Test } from './test.graphql'")).toBe(
      "const { TestFragment } = require('./test.graphql');",
    );
  });

  it('should convert imports with multiple imported identifiers', () => {
    expect(transformToRequire("# import { Test, User, Other } from './test.graphql'")).toBe(
      "const { TestFragment, UserFragment, OtherFragment } = require('./test.graphql');",
    );
  });
});

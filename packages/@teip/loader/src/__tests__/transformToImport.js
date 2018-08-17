/* @flow */
import { transformToImport } from '../util';

declare var describe: Function;
declare var it: Function;
declare var expect: Function;

describe('transformToImport', () => {
  it('should convert imports with one imported identifier', () => {
    expect(transformToImport("# import { Test } from './test.graphql'")).toBe(
      "import { TestFragment } from './test.graphql';",
    );
  });

  it('should convert imports with multiple imported identifiers', () => {
    expect(transformToImport("# import { Test, User, Other } from './test.graphql'")).toBe(
      "import { TestFragment, UserFragment, OtherFragment } from './test.graphql';",
    );
  });
});

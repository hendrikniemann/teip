/* @flow */
import { transformImport } from '../util';

declare var describe: Function;
declare var it: Function;
declare var expect: Function;

describe('transformImport', () => {
  it('should convert imports with one imported identifier', () => {
    expect(transformImport("# import { Test } from './test.graphql'")).toBe(
      "import { TestFragment } from './test.graphql';",
    );
  });

  it('should convert imports with multiple imported identifiers', () => {
    expect(transformImport("# import { Test, User, Other } from './test.graphql'")).toBe(
      "import { TestFragment, UserFragment, OtherFragment } from './test.graphql';",
    );
  });
});

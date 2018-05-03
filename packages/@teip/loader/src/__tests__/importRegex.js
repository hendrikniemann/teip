/* @flow */
import { importRegex } from '../util';

describe('importRegex', () => {
  it('should match imports with a single import', () => {
    expect(importRegex.test("# import { test } from './test.graphql'")).toBe(true);
  });

  it('should match imports with multiple imports', () => {
    expect(importRegex.test("# import { first, second } from './test.graphql'")).toBe(true);
  });

  it('should match imports with a lot of whitespace', () => {
    expect(importRegex.test("#   import  {  first  ,  second } from   './test.graphql'  ")).toBe(
      true,
    );
  });

  it('should match imports with a very few whitespace', () => {
    expect(importRegex.test("#import{first,second}from'./test.graphql'")).toBe(true);
  });

  it('should match imports using double quotes', () => {
    expect(importRegex.test('# import { test } from "./test.graphql"')).toBe(true);
  });

  it('should match imports from the wild', () => {
    expect(
      importRegex.test(
        "#import { TransferShortListUser, TransferShortListList } from 'components/TransferShortList/definitions.graphql'",
      ),
    ).toBe(true);
  });

  it('should not match empty lines', () => {
    expect(importRegex.test('')).toBe(false);
  });
});

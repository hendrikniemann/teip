/* @flow */
import { isImport } from '../';

describe('importRegex', () => {
  it('should match imports with a single import', () => {
    expect(isImport("# import test from './test.graphql'")).toBe(true);
  });

  it('should match imports with multiple imports', () => {
    expect(isImport("# import first, second from './test.graphql'")).toBe(true);
  });

  it('should match imports with a lot of whitespace', () => {
    expect(isImport("#   import  first  ,  second from   './test.graphql'  ")).toBe(true);
  });

  it('should match imports with a very few whitespace', () => {
    expect(isImport("#import first,second from'./test.graphql'")).toBe(true);
  });

  it('should match imports using double quotes', () => {
    expect(isImport('# import test from "./test.graphql"')).toBe(true);
  });

  it('should match imports from the wild', () => {
    expect(
      isImport(
        "#import TransferShortListUser, TransferShortListList from 'components/TransferShortList/definitions.graphql'",
      ),
    ).toBe(true);
  });

  it('should not match empty lines', () => {
    expect(isImport('')).toBe(false);
  });
});

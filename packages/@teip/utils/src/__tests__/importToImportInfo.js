/* @flow */
import { importToImportInfo } from '../';

describe('importRegex', () => {
  it('should extract info from imports with a single import', () => {
    expect(importToImportInfo("# import { test } from './test.graphql'")).toEqual({
      names: ['test'],
      path: './test.graphql',
    });
  });

  it('should extract info from imports with multiple imports', () => {
    expect(importToImportInfo("# import { first, second } from './test.graphql'")).toEqual({
      names: ['first', 'second'],
      path: './test.graphql',
    });
  });
});

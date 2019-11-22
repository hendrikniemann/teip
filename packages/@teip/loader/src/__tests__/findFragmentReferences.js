/* @flow */
import { parse } from 'graphql';
import { findFragmentReferences } from '../util';

const UserFragment = parse(`
  fragment UserFragment on User {
    picture {
      ...PictureFragment
    }
  }
`);

const PictureFragment = parse(`
  fragment PictureFragment on Picture {
    ...Fragment1
    ...Fragment2
    prop {
      ...Fragment3
    }
  }
`);

const ExampleQuery = parse(`
  query Example {
    ...Fragment1
    prop {
      ...Fragment2
    }
  }
`);

describe('findFragmentReferences', () => {
  it('should find a single fragment reference in another fragment', () => {
    const references = findFragmentReferences(UserFragment);
    expect(references).toEqual(['PictureFragment']);
  });

  it('should find multiple fragment references in another fragment', () => {
    const references = findFragmentReferences(PictureFragment);
    expect(references).toEqual(['Fragment1', 'Fragment2', 'Fragment3']);
  });

  it('should find multiple fragment references in a query', () => {
    const references = findFragmentReferences(ExampleQuery);
    expect(references).toEqual(['Fragment1', 'Fragment2']);
  });
});

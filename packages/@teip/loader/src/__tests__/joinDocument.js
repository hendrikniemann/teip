/* @flow */
import { parse } from 'graphql';
import { joinDocuments } from '../util';

const UserFragment = parse(`
  fragment UserFragment on User {
    picture {
      ...PictureFragment
    }
  }
`);

const PictureFragment = parse(`
  fragment PictureFragment on Picture {
    uri,
    width,
    height
  }
`);

const MultiFragment = parse(`
  fragment OtherFragment on Picture {
    id
  }

  fragment PictureFragment on Picture {
    uri,
    width,
    height
    ...OtherFragment
  }
`);

describe('joinDocuments', () => {
  it('should join a single document', () => {
    const doc = joinDocuments(UserFragment);
    expect(doc).toHaveProperty('kind', 'Document');
    expect(doc).toHaveProperty('definitions');

    expect(doc.definitions).toHaveLength(1);
  });

  it('should join multiple documents', () => {
    const doc = joinDocuments(UserFragment, PictureFragment);
    expect(doc).toHaveProperty('kind', 'Document');
    expect(doc).toHaveProperty('definitions');

    expect(doc.definitions).toHaveLength(2);
  });

  it('should join documents with multiple definitions', () => {
    const doc = joinDocuments(MultiFragment, UserFragment);
    expect(doc).toHaveProperty('kind', 'Document');
    expect(doc).toHaveProperty('definitions');

    expect(doc.definitions).toHaveLength(3);
  });

  it('should remove dublicate definitions', () => {
    const doc = joinDocuments(PictureFragment, PictureFragment);
    expect(doc).toHaveProperty('kind', 'Document');
    expect(doc).toHaveProperty('definitions');

    expect(doc.definitions).toHaveLength(1);
  });
});

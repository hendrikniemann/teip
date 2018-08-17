/* @flow */
import { parse } from 'graphql';
import loader from '../';

function createCompiler(callback: Function, query: Object | string = {}) {
  return {
    query,
    async: jest.fn(() => callback),
  };
}

describe('loader', () => {
  it('should compile a simple file', () => {
    const source = `# import { Test } from './test.graphql'

query Hello {
  world {
    ...Test
  }
}
`;
    const compiler = createCompiler(() => {});
    const result = loader.call(compiler, source);
    expect(result).toMatchSnapshot();
  });

  it('should compile a file with multiple definitions', () => {
    const source = `
fragment Test on World {
  id
  denomination
}

query Hello {
  world {
    ...Test
  }
}
`;
    const compiler = createCompiler(() => {});
    const result = loader.call(compiler, source);
    expect(result).toMatchSnapshot();
  });

  it('should transpile files with mutations', () => {
    const source = `#import 'components/TransferShortList/definitions.graphql'

mutation doSomething {
  doSomething(what: "Something") {
    xyz
  }
}
`;

    const compiler = createCompiler(() => {});
    const result = loader.call(compiler, source);
    expect(result).toMatchSnapshot();
  });

  it('should transpile files with malformed imports', () => {
    const source = `#import 'components/TransferShortList/definitions.graphql'

query TransferShortList {
  transferChecklist {
    ...TransferShortListList
  }
  me {
    ...TransferShortListUser
  }
}
`;

    const compiler = createCompiler(() => {});
    const result = loader.call(compiler, source);
    expect(result).toMatchSnapshot();
  });

  it('should compile with option "esModules" set to false', () => {
    const source = `# import { Test } from './test.graphql'

query Hello {
  world {
    ...Test
  }
}
`;
    const compiler = createCompiler(() => {}, { esModules: false });
    const result = loader.call(compiler, source);
    expect(result).toContain('var HelloQuery =');
    expect(result).toContain('exports.HelloQuery = HelloQuery;');
    expect(result).toContain("require('./test.graphql')");
  });
});

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.e2e-spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  // jose v6 ships as ESM ("type": "module") so Jest's default CJS resolver
  // chokes on it. We map the bare specifier directly to the dist file that
  // Node can require() in CJS mode just fine.
  // jose v6 ships as ESM ("type":"module") and all its sub-files use `export`
  // syntax. In a pnpm workspace, the real files live under the pnpm content-
  // addressable store at a path like:
  //   …/node_modules/.pnpm/jose@6.x.x/node_modules/jose/dist/…
  // The default transformIgnorePatterns excludes ALL of node_modules, so we
  // must poke a hole for jose at both the direct and pnpm-nested paths.
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm/jose@[^/]+/node_modules/jose|jose)/)',
  ],
};

#!/usr/bin/env node

const cwd = require('process').cwd();

const { build } = require('esbuild');
const serve = require('@es-exec/esbuild-plugin-serve').default;
const copy = require('esbuild-plugin-copy').default;

const { dependencies, peerDependencies } = require(`${cwd}/package.json`);

const sharedConfig = {
  entryPoints: [`${cwd}/src/movex.config.ts`],
  bundle: true,
  minify: true,
  external: Object.keys(dependencies).concat(Object.keys(peerDependencies)),
};

build({
  ...sharedConfig,
  platform: 'node',
  outfile: `${cwd}/.movex/dist/index.js`,
  plugins: [
    copy({
      resolveFrom: 'cwd',
      assets: {
        from: ['node_modules/movex-server/src/run.js'],
        to: [`./.movex`],
      },
    }),
    serve({ main: './.movex/run.js' }),
  ],
});

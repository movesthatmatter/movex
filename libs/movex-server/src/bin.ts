#!/usr/bin/env node

const cwd = require('process').cwd();
const esb = require('esbuild');
const serve = require('@es-exec/esbuild-plugin-serve').default;
const copy = require('esbuild-plugin-copy').default;

const { dependencies, peerDependencies } = require(`${cwd}/package.json`);

const args = process.argv.slice(2);
const isWatchMode = args.includes('--watch');

const sharedConfig = {
  entryPoints: [`${cwd}/src/movex.config.ts`],
  bundle: true,
  minify: false,
  external: Object.keys(dependencies).concat(Object.keys(peerDependencies)),
  platform: 'node',
  outfile: `${cwd}/.movex/dist/index.js`,
};

const watchPlugin = {
  name: 'watch-plugin',
  setup(build: any) {
    build.onStart(() => {
      console.log('Building starting...');
    });
    build.onEnd(() => {
      console.log('Building finished ok.');
    });
  },
};

const copyRunPlugin = copy({
  resolveFrom: 'cwd',
  assets: {
    from: ['node_modules/movex-server/src/bin/run.js'],
    to: [`./.movex`],
  },
});

const servePlugin = serve({ main: './.movex/run.js' });

if (isWatchMode) {
  (async () => {
    const ctx = await esb.context({
      ...sharedConfig,
      plugins: [copyRunPlugin, servePlugin, watchPlugin],
    });
    await ctx.watch();
    console.log('Watching...');
  })();
} else {
  (async () => {
    const ctx = await esb.context({
      ...sharedConfig,
      minify: true,
      plugins: [copyRunPlugin, servePlugin],
    });

    console.log('Building...');

    ctx.rebuild();
    ctx.dispose();
  })();
}

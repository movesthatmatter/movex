#!/usr/bin/env node

const cwd = require('process').cwd();
const esb = require('esbuild');
const serve = require('@es-exec/esbuild-plugin-serve').default;
const copy = require('esbuild-plugin-copy').default;

const { dependencies, peerDependencies } = require(`${cwd}/package.json`);

const go = (args: string[]) => {
  // const isWatchMode = args.includes('--watch');
  const commands = {
    dev: 'Starts the Movex Service in watch mode',
    serve: 'Serves the Movex Service',
  };

  const hasCommand = <K extends keyof typeof commands>(k: K): boolean =>
    args.includes(k);

  const hasAnyCommand = Object.keys(commands).find((k) =>
    hasCommand(k as keyof typeof commands)
  );

  if (args.includes('--help')) {
    console.log(commands);

    return;
  }

  if (!hasAnyCommand) {
    console.log('No command given. See --help');
    return;
  }

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

  if (hasCommand('dev')) {
    (async () => {
      const ctx = await esb.context({
        ...sharedConfig,
        plugins: [copyRunPlugin, servePlugin, watchPlugin],
      });
      await ctx.watch();
      console.log('Watching...');
    })();
  } else if (hasCommand('serve')) {
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
};

go(process.argv.slice(2));

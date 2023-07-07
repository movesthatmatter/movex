const { join } = require('path');
// const { createGlobPatternsForDependencies } = require('tailwind');

/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: 'jit',
  content: [
    join(
      __dirname,
      '{src,pages,components,app,modules}/**/*!(*.stories|*.spec).{ts,tsx,html}'
    ),
    // ...createGlobPatternsForDependencies(__dirname),
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

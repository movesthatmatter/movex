const { withNx } = require('@nrwl/next/plugins/with-nx');
const { remarkCodeHike } = require("@code-hike/mdx")

const withNextra = require('nextra')({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
  // mdxOptions: {
  //   remarkPlugins: [[remarkCodeHike, { theme: "material-palenight" }]],
  // },
})
 
module.exports = withNx(withNextra())
 
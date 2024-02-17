const { withNx } = require('@nrwl/next/plugins/with-nx');

const withNextra = require('nextra')({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
})
 
module.exports = withNx(withNextra())
 
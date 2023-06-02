import { DocsThemeConfig } from 'nextra-theme-docs';
import { Logo } from './modules/Logo';

const config: DocsThemeConfig = {
  logo: <Logo />,
  project: {
    link: 'https://github.com/movesthatmatter/movex',
  },
  chat: {
    link: 'https://discord.com',
  },
  docsRepositoryBase: 'https://github.com/movesthatmatter/movex',
  footer: {
    text: 'Movex Docs',
  },
};

export default config;

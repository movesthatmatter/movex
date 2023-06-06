import { DocsThemeConfig } from 'nextra-theme-docs';
import { Logo } from './modules/Logo';
import { Footer } from './components/Footer';

const config: DocsThemeConfig = {
  logo: <Logo />,
  project: {
    link: 'https://github.com/movesthatmatter/movex',
  },
  chat: {
    link: 'https://discord.gg/N8k447EmBh',
  },
  docsRepositoryBase: 'https://github.com/movesthatmatter/movex',
  // footer: {
  //   text: 'Movex',
  // },
  footer: {
    text: <Footer />,
  },
};

export default config;

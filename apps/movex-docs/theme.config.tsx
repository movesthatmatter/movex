import { DocsThemeConfig } from 'nextra-theme-docs';
import { Logo } from './modules/Logo';
import { Footer } from './components/Footer';
import { useRouter } from 'next/router';

const tags = {
  description:
    'Multiplayer State Synchronization. Server Authoritative. No Server Code. Secret State. Redux Api. Realtime',
};

const config: DocsThemeConfig = {
  logo: <Logo />,
  project: {
    link: 'https://github.com/movesthatmatter/movex',
  },
  chat: {
    link: 'https://discord.gg/N8k447EmBh',
  },
  docsRepositoryBase: 'https://github.com/movesthatmatter/movex',
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="Movex State Sync" />
      <meta property="og:description" content={tags.description} />
      <meta name="apple-mobile-web-app-title" content="Movex" />
    </>
  ),
  footer: {
    text: <Footer />,
  },
  useNextSeoProps: () => {
    const { asPath } = useRouter();

    return {
      titleTemplate: asPath === '/' ? 'Movex' : '%s | Movex',
      description: tags.description,
    };
  },
};

export default config;

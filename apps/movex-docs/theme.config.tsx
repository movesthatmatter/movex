import { DocsThemeConfig } from 'nextra-theme-docs';
import { Logo } from './modules/Logo';
import { Footer } from './components/Footer';
import { useRouter } from 'next/router';

const tags = {
  description:
    'Serverless real-time data sharing infrastructure for front-end developers. Server Authoritative. Secret State. Real Time Multiplayer State Synchronization.',
};

const config: DocsThemeConfig = {
  logo: <Logo />,
  banner: {
    key: 'dev-version-aug-2023',
    text: () => (
      <span>
        Movex is <a href="/docs/overview/introduction" style={{ textDecoration: 'underline' }}>feature-complete</a> yet still in Development for now.
        Contributions and feedback are much{' '}
        <a
          href="https://github.com/movesthatmatter/movex/issues"
          target='_blank'
          style={{ textDecoration: 'underline' }}
        >
          appreciated
        </a>
        !
      </span>
    ),
    dismissible: true,
  },
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
      <meta property="og:title" content="Movex" />
      <meta property="og:description" content={tags.description} />
      <meta name="apple-mobile-web-app-title" content="Movex" />
    </>
  ),
  footer: {
    text: <Footer />,
  },
  // darkMode: false,
  // nextThemes: {
  //   defaultTheme: 'dark',
  // },
  useNextSeoProps: () => {
    const { asPath } = useRouter();

    return {
      titleTemplate: asPath === '/' ? 'Movex' : '%s | Movex',
      description: tags.description,
    };
  },
};

export default config;

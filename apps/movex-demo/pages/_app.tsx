import { AppProps } from 'next/app';
import { Analytics } from '@vercel/analytics/react';
import Head from 'next/head';
import './styles.css';
import { MovexLocalMasterProvider } from 'movex-react';
import { useRouter } from 'next/router';
import movexConfig from 'movex-examples';

function CustomApp({ Component, pageProps }: AppProps) {
  // console.log(pageProps);
  const router = useRouter();

  return (
    <MovexLocalMasterProvider
      movexDefinition={movexConfig}
      onInit={(x) => {
        console.log('[MovexLocalMaster] initiated', x);
      }}
    >
      <Head>
        <title>Welcome to movex-demo!</title>
      </Head>
      <main className="app">
        <Component {...pageProps} />
        <Analytics />
      </main>
    </MovexLocalMasterProvider>
  );
}

export default CustomApp;

import { AppProps } from 'next/app';
import { Analytics } from '@vercel/analytics/react';
import Head from 'next/head';
import './styles.css';
import { MovexLocalMasterProvider } from 'movex-react';
import movexConfig from 'movex-examples';
import '../globals.css';

function CustomApp({ Component, pageProps }: AppProps) {
  return (
    <MovexLocalMasterProvider movexDefinition={movexConfig}>
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

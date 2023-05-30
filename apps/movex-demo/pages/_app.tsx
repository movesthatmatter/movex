import { AppProps } from 'next/app';
import Head from 'next/head';
import './styles.css';
import movexConfig from '../movex.config';
import { AppConfig } from '../app.config';
import { MovexProvider } from 'movex-react';

function CustomApp({ Component, pageProps }: AppProps) {
  return (
    <MovexProvider
      movexDefinition={movexConfig}
      socketUrl={AppConfig.API_WSS_ENDPOINT}
    >
      <Head>
        <title>Welcome to movex-demo!</title>
      </Head>
      <main className="app">
        <Component {...pageProps} />
      </main>
    </MovexProvider>
  );
}

export default CustomApp;

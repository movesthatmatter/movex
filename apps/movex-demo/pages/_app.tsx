import { AppProps } from 'next/app';
import Head from 'next/head';
import './styles.css';
import { AppConfig } from '../app.config';
import {
  MovexLocalMasterProvider,
  MovexLocalProvider,
  MovexProvider,
} from 'movex-react';
import { useRouter } from 'next/router';
import movexConfig from 'movex-examples';

function CustomApp({ Component, pageProps }: AppProps) {
  // console.log(pageProps);
  const router = useRouter();

  // console.log('rr', router);
  // const canPersistClientId =
  // const clientId = invoke(() => {
  //   return window.localStorage.getItem('movexCliendId') || undefined;
  // })

  return (
    <MovexLocalMasterProvider movexDefinition={movexConfig}>
      <Head>
        <title>Welcome to movex-demo!</title>
      </Head>
      <main className="app">
        <Component {...pageProps} />
      </main>
    </MovexLocalMasterProvider>
  );
}

export default CustomApp;

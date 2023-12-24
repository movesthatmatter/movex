import { AppProps } from 'next/app';
import Head from 'next/head';
import './styles.css';
import { AppConfig } from '../app.config';
import { MovexProvider } from 'movex-react';
import { useRouter } from 'next/router';
import movexConfig from 'movex-examples';
import { logsy } from 'movex-core-util';

export default function AppWithMovex({ Component, pageProps }: AppProps) {
  logsy.log(pageProps);
  const router = useRouter();

  // console.log('r', router);
  // const canPersistClientId =
  // const clientId = invoke(() => {
  //   return window.localStorage.getItem('movexCliendId') || undefined;
  // })

  return (
    <MovexProvider
      endpointUrl="localhost:3333"
      movexDefinition={movexConfig}
      onConnected={(movex) => {
        console.log('movex conntected');
      }}
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

import { AppProps } from 'next/app';
import Head from 'next/head';
import './styles.css';
import { AppConfig } from '../app.config';
import { MovexProvider } from 'movex-react';
import { useRouter } from 'next/router';
import movexConfig from 'movex-examples';

function CustomApp({ Component, pageProps }: AppProps) {
  console.log(pageProps);
  const router = useRouter();

  // console.log('r', router);
  // const canPersistClientId =
  // const clientId = invoke(() => {
  //   return window.localStorage.getItem('movexCliendId') || undefined;
  // })

  return (
    <MovexProvider
      movexDefinition={movexConfig}
      socketUrl={AppConfig.API_WSS_ENDPOINT}
      onConnected={(m) => {
        console.log('connnected to movex', m);
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

export default CustomApp;

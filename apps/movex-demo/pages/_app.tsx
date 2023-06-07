import { AppProps } from 'next/app';
import Head from 'next/head';
import './styles.css';
import movexConfig from '../movex.config';
import { AppConfig } from '../app.config';
import { MovexProvider } from 'movex-react';
import { useMemo } from 'react';
import { invoke } from 'movex-core-util';
import { useRouter } from 'next/router';

function CustomApp({ Component, pageProps }: AppProps) {
  console.log(pageProps);
  const router = useRouter();

  console.log('r', router)
  // const canPersistClientId = 
  // const clientId = invoke(() => {
  //   return window.localStorage.getItem('movexCliendId') || undefined;
  // })


  return (
    <MovexProvider
      movexDefinition={movexConfig}
      socketUrl={AppConfig.API_WSS_ENDPOINT}
      onConnected={(m) => {
        
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

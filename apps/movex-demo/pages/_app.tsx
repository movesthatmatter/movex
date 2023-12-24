import { AppProps } from 'next/app';
import { Analytics } from '@vercel/analytics/react';
import Head from 'next/head';
import './styles.css';
import '../globals.css';
import AppWithMovex from './_app_with_movex';

// function CustomApp({ Component, pageProps }: AppProps) {
//   return (
//     <>
//       <Head>
//         <title>Welcome to movex-demo!</title>
//       </Head>
//       <main className="app">
//         <Component {...pageProps} />
//         <Analytics />
//       </main>
//     </>
//   );
// }

// export default CustomApp;

export default AppWithMovex;
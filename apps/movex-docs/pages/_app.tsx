import React from 'react';
import { Analytics } from '@vercel/analytics/react';
import 'tailwindcss/tailwind.css';
import '../globals.css';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}

export default MyApp;

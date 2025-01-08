'use client';
import 'jsvectormap/dist/jsvectormap.css';
import 'flatpickr/dist/flatpickr.min.css';
import '../css/satoshi.css';
import '../css/style.css';
import React, { useEffect, useState } from 'react';
import Loader from '../components/common/Loader';
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';

export default function MyApp({ Component, pageProps }: any) {
  // const [sidebarOpen, setSidebarOpen] = useState(false);
  // const [loading, setLoading] = useState<boolean>(true);

  // const pathname = usePathname();

  // useEffect(() => {
  //   setTimeout(() => setLoading(false), 1000);
  // }, []);
  return (
    <main className="app">
      <Theme>
        <Component {...pageProps} />
      </Theme>
    </main>
  );

  // return (
  // <html lang="en">
  //   <body suppressHydrationWarning={true}>
  //     <div className="dark:bg-boxdark-2 dark:text-bodydark">
  //       {children}
  //       {/* {loading ? <Loader /> : children} */}
  //     </div>
  //   </body>
  // </html>
  // );
}
